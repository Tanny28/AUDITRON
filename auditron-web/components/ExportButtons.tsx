'use client'

import { useState } from 'react'
import { exportToCSV } from '@/lib/api/reports'
import jsPDF from 'jspdf'

interface ExportButtonsProps {
    data: any[]
    filename: string
    tableId?: string
}

export function ExportButtons({ data, filename, tableId }: ExportButtonsProps) {
    const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

    const handleCSVExport = () => {
        try {
            setExporting('csv')
            exportToCSV(data, filename)
        } catch (error) {
            console.error('CSV export failed:', error)
            alert('Failed to export CSV')
        } finally {
            setExporting(null)
        }
    }

    const handlePDFExport = () => {
        try {
            setExporting('pdf')

            const doc = new jsPDF()

            // Add title
            doc.setFontSize(16)
            doc.text(filename, 14, 20)

            // Add date
            doc.setFontSize(10)
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

            // Add table data
            let yPos = 40
            const lineHeight = 7

            if (data.length > 0) {
                // Headers
                const headers = Object.keys(data[0])
                doc.setFontSize(10)
                doc.setFont(undefined, 'bold')
                headers.forEach((header, index) => {
                    doc.text(header, 14 + index * 40, yPos)
                })

                // Rows
                doc.setFont(undefined, 'normal')
                yPos += lineHeight

                data.slice(0, 30).forEach((row) => {
                    headers.forEach((header, index) => {
                        const value = row[header]?.toString() || ''
                        doc.text(value.substring(0, 15), 14 + index * 40, yPos)
                    })
                    yPos += lineHeight

                    // Add new page if needed
                    if (yPos > 280) {
                        doc.addPage()
                        yPos = 20
                    }
                })
            }

            // Save PDF
            doc.save(`${filename}.pdf`)
        } catch (error) {
            console.error('PDF export failed:', error)
            alert('Failed to export PDF')
        } finally {
            setExporting(null)
        }
    }

    return (
        <div className="flex gap-3">
            <button
                onClick={handleCSVExport}
                disabled={exporting === 'csv'}
                className="btn btn-outline"
                aria-label="Export to CSV"
            >
                {exporting === 'csv' ? (
                    <span className="flex items-center gap-2">
                        <div className="spinner" />
                        Exporting...
                    </span>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </>
                )}
            </button>

            <button
                onClick={handlePDFExport}
                disabled={exporting === 'pdf'}
                className="btn btn-gold"
                aria-label="Export to PDF"
            >
                {exporting === 'pdf' ? (
                    <span className="flex items-center gap-2">
                        <div className="spinner" />
                        Exporting...
                    </span>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Export PDF
                    </>
                )}
            </button>
        </div>
    )
}
