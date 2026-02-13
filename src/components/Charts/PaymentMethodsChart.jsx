import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const PaymentMethodsChart = ({ data }) => {
  const chartData = {
    labels: ['Cash', 'Online'],
    datasets: [{
      data: [data?.cash || 0, data?.online || 0],
      backgroundColor: ['#F59E0B', '#10B981'],
      borderWidth: 2,
      borderColor: '#fff'
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
        callbacks: { label: (context) => `${context.label}: ₹${context.parsed.toLocaleString()}` }
      }
    }
  };

  return <div className="h-64 md:h-80"><Doughnut data={chartData} options={options} /></div>;
};

export default PaymentMethodsChart;
