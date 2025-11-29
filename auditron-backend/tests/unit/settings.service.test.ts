import { UserSettingsService } from '../../src/services/UserSettingsService'
import { prisma } from '../../src/lib/prisma'
import { hash, compare } from 'bcrypt'

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}))

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}))

jest.mock('../../src/services/AgentLogger')

describe('UserSettingsService', () => {
    let userSettingsService: UserSettingsService

    beforeEach(() => {
        jest.clearAllMocks()
        userSettingsService = new UserSettingsService()
    })

    describe('updateProfile', () => {
        it('should update user profile fields', async () => {
            const mockUserId = 'user_123'
            const updates = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '+91 9876543210',
                timezone: 'Asia/Kolkata',
            }

            const mockUpdatedUser = {
                id: mockUserId,
                email: 'john@example.com',
                ...updates,
            }

                ; (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser)

            const result = await userSettingsService.updateProfile(mockUserId, updates)

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: updates,
            })

            expect(result).toEqual(
                expect.objectContaining({
                    id: mockUserId,
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+91 9876543210',
                })
            )
        })

        it('should handle partial updates', async () => {
            const mockUserId = 'user_123'
            const updates = { firstName: 'Jane' }

                ; (prisma.user.update as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    firstName: 'Jane',
                })

            await userSettingsService.updateProfile(mockUserId, updates)

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: updates,
            })
        })
    })

    describe('updateNotificationPreferences', () => {
        it('should update notification preferences', async () => {
            const mockUserId = 'user_123'
            const preferences = {
                emailAlerts: true,
                jobAlerts: false,
                anomalyAlerts: true,
                weeklyReports: false,
            }

                ; (prisma.user.update as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    metadata: preferences,
                })

            const result = await userSettingsService.updateNotificationPreferences(
                mockUserId,
                preferences
            )

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: { metadata: preferences },
            })

            expect(result).toEqual(preferences)
        })
    })

    describe('getNotificationPreferences', () => {
        it('should return user notification preferences', async () => {
            const mockUserId = 'user_123'
            const mockPreferences = {
                emailAlerts: true,
                jobAlerts: true,
                anomalyAlerts: false,
            }

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    metadata: mockPreferences,
                })

            const result = await userSettingsService.getNotificationPreferences(mockUserId)

            expect(result).toEqual(mockPreferences)
        })

        it('should return defaults if no preferences set', async () => {
            const mockUserId = 'user_123'

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    metadata: null,
                })

            const result = await userSettingsService.getNotificationPreferences(mockUserId)

            expect(result).toEqual({
                emailAlerts: true,
                jobAlerts: true,
                anomalyAlerts: true,
                weeklyReports: false,
            })
        })
    })

    describe('changePassword', () => {
        it('should change password with correct current password', async () => {
            const mockUserId = 'user_123'
            const currentPassword = 'oldPassword123'
            const newPassword = 'newPassword456'
            const mockPasswordHash = 'hashed_old_password'
            const mockNewHash = 'hashed_new_password'

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    passwordHash: mockPasswordHash,
                })

                ; (compare as jest.Mock).mockResolvedValue(true)
                ; (hash as jest.Mock).mockResolvedValue(mockNewHash)
                ; (prisma.user.update as jest.Mock).mockResolvedValue({})

            await userSettingsService.changePassword(mockUserId, currentPassword, newPassword)

            expect(compare).toHaveBeenCalledWith(currentPassword, mockPasswordHash)
            expect(hash).toHaveBeenCalledWith(newPassword, 10)
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: { passwordHash: mockNewHash },
            })
        })

        it('should reject incorrect current password', async () => {
            const mockUserId = 'user_123'

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    passwordHash: 'hashed_password',
                })

                ; (compare as jest.Mock).mockResolvedValue(false)

            await expect(
                userSettingsService.changePassword(mockUserId, 'wrongPassword', 'newPassword')
            ).rejects.toThrow('Current password is incorrect')

            expect(prisma.user.update).not.toHaveBeenCalled()
        })

        it('should throw error if user not found', async () => {
            const mockUserId = 'user_123'

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

            await expect(
                userSettingsService.changePassword(mockUserId, 'old', 'new')
            ).rejects.toThrow('User not found')
        })
    })

    describe('uploadProfilePicture', () => {
        it('should update profile picture URL', async () => {
            const mockUserId = 'user_123'
            const mockFileUrl = 'https://cdn.auditron.ai/profiles/user_123.jpg'

                ; (prisma.user.update as jest.Mock).mockResolvedValue({
                    id: mockUserId,
                    profilePictureUrl: mockFileUrl,
                })

            const result = await userSettingsService.uploadProfilePicture(mockUserId, mockFileUrl)

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: { profilePictureUrl: mockFileUrl },
            })

            expect(result).toBe(mockFileUrl)
        })
    })

    describe('getUserSettings', () => {
        it('should return complete user settings', async () => {
            const mockUserId = 'user_123'
            const mockUser = {
                id: mockUserId,
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+91 9876543210',
                timezone: 'Asia/Kolkata',
                profilePictureUrl: 'https://cdn.auditron.ai/profile.jpg',
                metadata: { emailAlerts: true },
                organization: {
                    id: 'org_123',
                    name: 'Test Org',
                },
                role: 'ADMIN',
            }

                ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

            const result = await userSettingsService.getUserSettings(mockUserId)

            expect(result).toEqual({
                profile: expect.objectContaining({
                    id: mockUserId,
                    email: 'user@example.com',
                    firstName: 'John',
                }),
                organization: expect.objectContaining({
                    id: 'org_123',
                    name: 'Test Org',
                    role: 'ADMIN',
                }),
                notifications: { emailAlerts: true },
            })
        })
    })
})
