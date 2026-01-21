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
                return `Date: ${new Date(singleDate!).toLocaleDateString()}`;
            } else if (dateFilterType === 'range') {
                return `Period: ${new Date(startDate!).toLocaleDateString()} - ${new Date(endDate!).toLocaleDateString()}`;
            }
            return 'All Time';
        };

        return (
            <div ref={ref} className="p-8 bg-white">
                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Darb Station</h1>
                    <h2 className="text-xl font-semibold text-gray-700">Inventory Sales Report</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        Station Type: <span className="font-semibold capitalize">{stationFilter}</span> • {getDateRangeText()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Generated on: {new Date().toLocaleString()}
                    </p>
                </div>

                {/* Summary Section */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-300">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Total Stations:</p>
                            <p className="text-xl font-bold text-gray-900">{stations.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue:</p>
                            <p className="text-xl font-bold text-green-600">{totalRevenue.toFixed(2)} SAR</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Volume:</p>
                            <p className="text-xl font-bold text-blue-600">{totalLiters.toFixed(2)} L</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Fuel Breakdown:</p>
                            <div className="text-xs space-y-1 mt-1">
                                <p>91 Gasoline: <span className="font-semibold">{total91Liters.toFixed(2)} L</span></p>
                                <p>95 Gasoline: <span className="font-semibold">{total95Liters.toFixed(2)} L</span></p>
                                <p>98 Gasoline: <span className="font-semibold">{total98Liters.toFixed(2)} L</span></p>
                                <p>Diesel: <span className="font-semibold">{totalDieselLiters.toFixed(2)} L</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stations Table */}
                <table className="w-full border-collapse border border-gray-400 text-sm">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-400 px-3 py-2 text-left font-semibold">#</th>
                            <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Station Name</th>
                            <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Type</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">91 Gasoline (L)</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">95 Gasoline (L)</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">98 Gasoline (L)</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Diesel (L)</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Total Liters</th>
                            <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Total Amount (SAR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.map((station, index) => (
                            <tr key={station.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-gray-400 px-3 py-2">{index + 1}</td>
                                <td className="border border-gray-400 px-3 py-2 font-medium">{station.name}</td>
                                <td className="border border-gray-400 px-3 py-2 text-xs">{station.stationType}</td>
                                <td className="border border-gray-400 px-3 py-2 text-right">
                                    {(station.fuelBreakdown.gasoline91?.liters || 0).toFixed(2)}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-right">
                                    {(station.fuelBreakdown.gasoline95?.liters || 0).toFixed(2)}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-right">
                                    {(station.fuelBreakdown.gasoline98?.liters || 0).toFixed(2)}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-right">
                                    {(station.fuelBreakdown.diesel?.liters || 0).toFixed(2)}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-right font-semibold">
                                    {station.totalLiters.toFixed(2)}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-right font-semibold">
                                    {station.totalRevenue.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-300 font-bold">
                            <td colSpan={3} className="border border-gray-400 px-3 py-2 text-right">TOTAL:</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{total91Liters.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{total95Liters.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{total98Liters.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{totalDieselLiters.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{totalLiters.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">{totalRevenue.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-400 text-center text-xs text-gray-600">
                    <p>This is a computer-generated report. No signature is required.</p>
                    <p className="mt-1">Darb Station - Fuel Management System</p>
                </div>
            </div>
        );
    }
);

PrintableInventoryReport.displayName = 'PrintableInventoryReport';
