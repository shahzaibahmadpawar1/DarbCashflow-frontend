import React from 'react';

interface FuelBreakdown {
    liters: number;
    amount: number;
}

interface StationData {
    id: string;
    name: string;
    stationType: string;
    totalRevenue: number;
    totalLiters: number;
    fuelBreakdown: {
        gasoline91: FuelBreakdown;
        gasoline95: FuelBreakdown;
        gasoline98: FuelBreakdown;
        diesel: FuelBreakdown;
    };
}

interface PrintableInventoryReportProps {
    stations: StationData[];
    stationFilter: string;
    dateFilterType: string;
    singleDate?: string;
    startDate?: string;
    endDate?: string;
}

export const PrintableInventoryReport = React.forwardRef<HTMLDivElement, PrintableInventoryReportProps>(
    ({ stations, stationFilter, dateFilterType, singleDate, startDate, endDate }, ref) => {
        const totalRevenue = stations.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalLiters = stations.reduce((sum, s) => sum + s.totalLiters, 0);

        const total91Liters = stations.reduce((sum, s) => sum + (s.fuelBreakdown.gasoline91?.liters || 0), 0);
        const total95Liters = stations.reduce((sum, s) => sum + (s.fuelBreakdown.gasoline95?.liters || 0), 0);
        const total98Liters = stations.reduce((sum, s) => sum + (s.fuelBreakdown.gasoline98?.liters || 0), 0);
        const totalDieselLiters = stations.reduce((sum, s) => sum + (s.fuelBreakdown.diesel?.liters || 0), 0);

        const getDateRangeText = () => {
            if (dateFilterType === 'single') {
                return new Date(singleDate!).toLocaleDateString();
            } else if (dateFilterType === 'range') {
                return `${new Date(startDate!).toLocaleDateString()} - ${new Date(endDate!).toLocaleDateString()}`;
            }
            return 'All Time';
        };

        return (
            <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: 'white' }}>
                <style>{`
                    @media print {
                        body { margin: 0; padding: 0; }
                        @page { margin: 15mm; size: A4; }
                        .page-break { page-break-before: always; }
                        .no-break { page-break-inside: avoid; }
                    }
                    h1 { 
                        color: #333; 
                        border-bottom: 2px solid #007bff; 
                        padding-bottom: 10px; 
                        margin-bottom: 5px;
                        font-size: 24px;
                    }
                    h2 { 
                        color: #555; 
                        margin-top: 20px; 
                        font-size: 18px;
                        margin-bottom: 10px;
                    }
                    .info-grid { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        gap: 10px; 
                        margin: 15px 0; 
                    }
                    .info-item { 
                        padding: 8px; 
                        background: #f5f5f5; 
                        border-radius: 4px; 
                    }
                    .info-label { 
                        font-weight: bold; 
                        color: #666; 
                        font-size: 12px;
                    }
                    .info-value {
                        color: #333;
                        font-size: 14px;
                        margin-top: 2px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 15px 0; 
                        font-size: 11px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 6px 8px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #007bff; 
                        color: white; 
                        font-weight: bold;
                        font-size: 11px;
                    }
                    tr:nth-child(even) { 
                        background-color: #f9f9f9; 
                    }
                    .totals-row {
                        background-color: #e9ecef !important;
                        font-weight: bold;
                    }
                    .text-right { text-align: right; }
                    .summary-section {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 15px 0;
                    }
                    .fuel-breakdown {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin-top: 8px;
                        font-size: 11px;
                    }
                    .fuel-item {
                        padding: 4px 8px;
                        background: white;
                        border-radius: 4px;
                    }
                    .footer {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 10px;
                        color: #666;
                    }
                `}</style>

                {/* Header */}
                <h1>Inventory Sales Report</h1>

                <div className="info-grid">
                    <div className="info-item">
                        <div className="info-label">Station Type:</div>
                        <div className="info-value" style={{ textTransform: 'capitalize' }}>{stationFilter}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Date Range:</div>
                        <div className="info-value">{getDateRangeText()}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Total Stations:</div>
                        <div className="info-value">{stations.length}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Generated On:</div>
                        <div className="info-value">{new Date().toLocaleString()}</div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="summary-section no-break">
                    <h2 style={{ marginTop: 0 }}>Summary</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <div className="info-label">Total Revenue:</div>
                            <div className="info-value" style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>
                                {totalRevenue.toFixed(2)} SAR
                            </div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Total Volume:</div>
                            <div className="info-value" style={{ color: '#007bff', fontWeight: 'bold', fontSize: '16px' }}>
                                {totalLiters.toFixed(2)} L
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                        <div className="info-label">Fuel Breakdown:</div>
                        <div className="fuel-breakdown">
                            <div className="fuel-item">
                                <strong>91 Gasoline:</strong> {total91Liters.toFixed(2)} L
                            </div>
                            <div className="fuel-item">
                                <strong>95 Gasoline:</strong> {total95Liters.toFixed(2)} L
                            </div>
                            <div className="fuel-item">
                                <strong>98 Gasoline:</strong> {total98Liters.toFixed(2)} L
                            </div>
                            <div className="fuel-item">
                                <strong>Diesel:</strong> {totalDieselLiters.toFixed(2)} L
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stations Table */}
                <h2>Station Details</h2>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}>#</th>
                            <th>Station Name</th>
                            <th style={{ width: '80px' }}>Type</th>
                            <th className="text-right" style={{ width: '70px' }}>91 Gas (L)</th>
                            <th className="text-right" style={{ width: '70px' }}>95 Gas (L)</th>
                            <th className="text-right" style={{ width: '70px' }}>98 Gas (L)</th>
                            <th className="text-right" style={{ width: '70px' }}>Diesel (L)</th>
                            <th className="text-right" style={{ width: '80px' }}>Total Liters</th>
                            <th className="text-right" style={{ width: '90px' }}>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.map((station, index) => (
                            <tr key={station.id}>
                                <td>{index + 1}</td>
                                <td style={{ fontWeight: '500' }}>{station.name}</td>
                                <td style={{ fontSize: '10px' }}>{station.stationType}</td>
                                <td className="text-right">
                                    {(station.fuelBreakdown.gasoline91?.liters || 0).toFixed(2)}
                                </td>
                                <td className="text-right">
                                    {(station.fuelBreakdown.gasoline95?.liters || 0).toFixed(2)}
                                </td>
                                <td className="text-right">
                                    {(station.fuelBreakdown.gasoline98?.liters || 0).toFixed(2)}
                                </td>
                                <td className="text-right">
                                    {(station.fuelBreakdown.diesel?.liters || 0).toFixed(2)}
                                </td>
                                <td className="text-right" style={{ fontWeight: 'bold' }}>
                                    {station.totalLiters.toFixed(2)}
                                </td>
                                <td className="text-right" style={{ fontWeight: 'bold' }}>
                                    {station.totalRevenue.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="totals-row">
                            <td colSpan={3} className="text-right">TOTAL:</td>
                            <td className="text-right">{total91Liters.toFixed(2)}</td>
                            <td className="text-right">{total95Liters.toFixed(2)}</td>
                            <td className="text-right">{total98Liters.toFixed(2)}</td>
                            <td className="text-right">{totalDieselLiters.toFixed(2)}</td>
                            <td className="text-right">{totalLiters.toFixed(2)}</td>
                            <td className="text-right">{totalRevenue.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer */}
                <div className="footer">
                    <p>This is a computer-generated report. No signature is required.</p>
                    <p style={{ marginTop: '5px' }}>Darb Station - Fuel Management System</p>
                </div>
            </div>
        );
    }
);

PrintableInventoryReport.displayName = 'PrintableInventoryReport';

