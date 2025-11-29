import { ApiKeyService } from '../../src/services/ApiKeyService'
import { prisma } from '../../src/lib/prisma'
import { scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
    prisma: {
        apiKey: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
    },
}))

jest.mock('../../src/services/AgentLogger')

describe('ApiKeyService', () => {
    let apiKeyService: ApiKeyService

    beforeEach(() => {
        jest.clearAllMocks()
        apiKeyService = new ApiKeyService()
    })

    describe('generateApiKey', () => {
        it('should generate API key and return plaintext once', async () => {
            const mockOrgId = 'org_123'
            const mockUserId = 'user_123'

                ; (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null)
                ; (prisma.apiKey.create as jest.Mock).mockResolvedValue({
                    id: 'key_123',
                    orgId: mockOrgId,
                    hashedKey: 'hashed_key',
                    maskedKey: 'ak_****1234',
                    active: true,
                })

            const result = await apiKeyService.generateApiKey(mockOrgId, mockUserId)

            expect(result.apiKey).toMatch(/^ak_[a-f0-9]{64}$/)
            expect(result.maskedKey).toMatch(/^ak_\*+[a-f0-9]{4}$/)
            expect(prisma.apiKey.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        orgId: mockOrgId,
                        createdBy: mockUserId,
                        active: true,
                    }),
                })
            )
        })

        it('should throw error if org already has active key', async () => {
            const mockOrgId = 'org_123'
            const mockUserId = 'user_123'

                ; (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
                    id: 'existing_key',
                    active: true,
                })

            await expect(
                apiKeyService.generateApiKey(mockOrgId, mockUserId)
            ).rejects.toThrow('Organization already has an active API key')
        })

        it('should store hashed key, not plaintext', async () => {
            const mockOrgId = 'org_123'
            const mockUserId = 'user_123'

                ; (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null)
                ; (prisma.apiKey.create as jest.Mock).mockResolvedValue({
                    id: 'key_123',
                })

            await apiKeyService.generateApiKey(mockOrgId, mockUserId)

            const createCall = (prisma.apiKey.create as jest.Mock).mock.calls[0][0]
            const hashedKey = createCall.data.hashedKey

            // Verify it's a hash (contains salt:hash format)
            expect(hashedKey).toMatch(/^[a-f0-9]+:[a-f0-9]+$/)
        })
    })

    describe('rotateApiKey', () => {
        it('should disable old key and generate new one', async () => {
            const mockOrgId = 'org_123'
            const mockUserId = 'user_123'

                ; (prisma.apiKey.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
                ; (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null)
                ; (prisma.apiKey.create as jest.Mock).mockResolvedValue({
                    id: 'new_key',
                })

            const result = await apiKeyService.rotateApiKey(mockOrgId, mockUserId)

            expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
                where: { orgId: mockOrgId, active: true },
                data: expect.objectContaining({
                    active: false,
                    disabledAt: expect.any(Date),
                }),
            })

            expect(result.apiKey).toBeTruthy()
            expect(result.maskedKey).toBeTruthy()
        })
    })

    describe('validateApiKey', () => {
        it('should validate correct API key', async () => {
            const rawKey = 'ak_test1234567890abcdef'
            const salt = 'testsalt'
            const derivedKey = (await scryptAsync(rawKey, salt, 64)) as Buffer
            const hashedKey = `${salt}:${derivedKey.toString('hex')}`

                ; (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
                    {
                        id: 'key_123',
                        orgId: 'org_123',
                        hashedKey,
                        active: true,
                    },
                ])

                ; (prisma.apiKey.update as jest.Mock).mockResolvedValue({})

            const result = await apiKeyService.validateApiKey(rawKey)

            expect(result.valid).toBe(true)
            expect(result.orgId).toBe('org_123')
            expect(result.keyId).toBe('key_123')
            expect(prisma.apiKey.update).toHaveBeenCalledWith({
                where: { id: 'key_123' },
                data: { lastUsedAt: expect.any(Date) },
            })
        })

        it('should reject invalid API key', async () => {
            ; (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'key_123',
                    hashedKey: 'salt:wronghash',
                    active: true,
                },
            ])

            const result = await apiKeyService.validateApiKey('ak_invalid')

            expect(result.valid).toBe(false)
            expect(result.orgId).toBeUndefined()
        })

        it('should reject disabled key', async () => {
            ; (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([])

            const result = await apiKeyService.validateApiKey('ak_disabled')

            expect(result.valid).toBe(false)
        })
    })

    describe('disableApiKey', () => {
        it('should disable all active keys for org', async () => {
            const mockOrgId = 'org_123'

                ; (prisma.apiKey.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

            await apiKeyService.disableApiKey(mockOrgId)

            expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
                where: { orgId: mockOrgId, active: true },
                data: expect.objectContaining({
                    active: false,
                    disabledAt: expect.any(Date),
                }),
            })
        })
    })

    describe('listApiKeys', () => {
        it('should return all keys for organization', async () => {
            const mockOrgId = 'org_123'
            const mockKeys = [
                {
                    id: 'key_1',
                    name: 'Key 1',
                    maskedKey: 'ak_****1234',
                    active: true,
                    createdAt: new Date(),
                },
                {
                    id: 'key_2',
                    name: 'Key 2',
                    maskedKey: 'ak_****5678',
                    active: false,
                    createdAt: new Date(),
                },
            ]

                ; (prisma.apiKey.findMany as jest.Mock).mockResolvedValue(mockKeys)

            const result = await apiKeyService.listApiKeys(mockOrgId)

            expect(result).toEqual(mockKeys)
            expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
                where: { orgId: mockOrgId },
                orderBy: { createdAt: 'desc' },
                select: expect.any(Object),
            })
        })
    })
})
