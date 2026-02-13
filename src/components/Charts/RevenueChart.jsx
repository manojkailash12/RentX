import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const RevenueChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [{
      label: 'Revenue (₹)',
      data: data?.values || [],
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: { label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString()}` }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value) => `₹${value.toLocaleString()}` } }
    }
  };

  return <div className="h-64 md:h-80"><Line data={chartData} options={options} /></div>;
};

export default RevenueChart;
