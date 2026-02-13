import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const BookingStatusChart = ({ data }) => {
  const chartData = {
    labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        data?.pending || 0,
        data?.confirmed || 0,
        data?.completed || 0,
        data?.cancelled || 0
      ],
      backgroundColor: ['#FCD34D', '#34D399', '#60A5FA', '#F87171'],
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
        callbacks: { label: (context) => `${context.label}: ${context.parsed} bookings` }
      }
    }
  };

  return <div className="h-64 md:h-80"><Pie data={chartData} options={options} /></div>;
};

export default BookingStatusChart;
