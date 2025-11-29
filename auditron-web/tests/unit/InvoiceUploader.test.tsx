import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceUploader } from '@/components/InvoiceUploader'
import * as invoiceApi from '@/lib/api/invoice'

// Mock the invoice API
jest.mock('@/lib/api/invoice')

describe('InvoiceUploader', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders upload dropzone', () => {
        render(<InvoiceUploader />)

        expect(screen.getByText(/drag & drop an invoice/i)).toBeInTheDocument()
        expect(screen.getByText(/supports pdf, png, jpg/i)).toBeInTheDocument()
    })

    it('handles successful file upload', async () => {
        const mockUploadInvoice = jest.spyOn(invoiceApi, 'uploadInvoice')
        mockUploadInvoice.mockResolvedValue({
            invoiceId: 'test-invoice-123',
            jobId: 'test-job-456',
        })

        const onSuccess = jest.fn()
        render(<InvoiceUploader onSuccess={onSuccess} />)

        // Create a test file
        const file = new File(['test content'], 'test-invoice.pdf', { type: 'application/pdf' })

        // Get the file input
        const input = screen.getByLabelText(/upload invoice file/i) as HTMLInputElement

        // Simulate file selection
        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false,
        })

        fireEvent.change(input)

        // Wait for upload to complete
        await waitFor(() => {
            expect(mockUploadInvoice).toHaveBeenCalledWith(
                file,
                expect.any(Function) // progress callback
            )
        })

        await waitFor(() => {
            expect(screen.getByText(/upload successful/i)).toBeInTheDocument()
            expect(screen.getByText(/test-invoice-123/)).toBeInTheDocument()
            expect(onSuccess).toHaveBeenCalledWith({
                invoiceId: 'test-invoice-123',
                jobId: 'test-job-456',
            })
        })
    })

    it('handles upload error', async () => {
        const mockUploadInvoice = jest.spyOn(invoiceApi, 'uploadInvoice')
        mockUploadInvoice.mockRejectedValue({
            error: 'Upload failed',
            statusCode: 500,
        })

        const onError = jest.fn()
        render(<InvoiceUploader onError={onError} />)

        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
        const input = screen.getByLabelText(/upload invoice file/i) as HTMLInputElement

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false,
        })

        fireEvent.change(input)

        await waitFor(() => {
            expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
            expect(onError).toHaveBeenCalled()
        })
    })

    it('shows progress during upload', async () => {
        let progressCallback: ((progress: number) => void) | null = null

        const mockUploadInvoice = jest.spyOn(invoiceApi, 'uploadInvoice')
        mockUploadInvoice.mockImplementation((file, onProgress) => {
            progressCallback = onProgress || null
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ invoiceId: 'test-123', jobId: 'job-456' })
                }, 100)
            })
        })

        render(<InvoiceUploader />)

        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
        const input = screen.getByLabelText(/upload invoice file/i) as HTMLInputElement

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false,
        })

        fireEvent.change(input)

        // Simulate progress updates
        await waitFor(() => {
            if (progressCallback) {
                progressCallback(50)
            }
        })

        expect(screen.getByText(/50%/)).toBeInTheDocument()
    })
})
