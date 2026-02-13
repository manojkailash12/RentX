import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TopCarsChart = ({ data }) => {
  const chartData = {
    labels: data?.map(car => `${car.brand} ${car.model}`) || [],
    datasets: [{
      label: 'Revenue (₹)',
      data: data?.map(car => car.totalRevenue) || [],
      backgroundColor: '#059669',
      borderRadius: 6
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: { label: (context) => `Revenue: ₹${context.parsed.x.toLocaleString()}` }
      }
    },
    scales: {
      x: { beginAtZero: true, ticks: { callback: (value) => `₹${value.toLocaleString()}` } }
    }
  };

  return <div className="h-64 md:h-96"><Bar data={chartData} options={options} /></div>;
};

export default TopCarsChart;
