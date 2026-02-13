import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ContractManager = ({ bookingId }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [bookingId]);

  const fetchContract = async () => {
    try {
      const { data } = await axios.get(`/api/smart-contracts/${bookingId}`);
      if (data.success) {
        setContract(data.contract);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const createContract = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/smart-contracts/create', { bookingId });
      if (data.success) {
        setContract(data.contract);
        toast.success('Smart contract created!');
      }
    } catch (error) {
      toast.error('Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      disputed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading contract...</div>;
  }

  if (!contract) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-4xl mb-4">📜</div>
        <h3 className="text-xl font-bold mb-2">No Smart Contract</h3>
        <p className="text-gray-600 mb-4">
          Create a blockchain-based smart contract for this booking
        </p>
        <button
          onClick={createContract}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Smart Contract
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Contract Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">📜 Smart Contract</h2>
            <p className="text-sm text-gray-600">Blockchain-based rental agreement</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(contract.status)}`}>
            {contract.status.toUpperCase()}
          </span>
        </div>

        {/* Contract Details */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Contract Address</p>
            <p className="font-mono text-sm break-all">{contract.contractAddress}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Network</p>
            <p className="font-semibold">{contract.network.toUpperCase()}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Transaction Hash</p>
            <p className="font-mono text-sm break-all">{contract.transactionHash}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Block Number</p>
            <p className="font-semibold">{contract.blockNumber}</p>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Contract Terms</h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded p-4">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">${contract.terms.totalAmount}</p>
            </div>
            <div className="bg-green-50 rounded p-4">
              <p className="text-sm text-gray-600">Deposit</p>
              <p className="text-2xl font-bold text-green-600">${contract.terms.deposit}</p>
            </div>
            <div className="bg-purple-50 rounded p-4">
              <p className="text-sm text-gray-600">Rental Period</p>
              <p className="text-sm font-semibold">
                {new Date(contract.terms.rentalPeriod.start).toLocaleDateString()} - 
                {new Date(contract.terms.rentalPeriod.end).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Penalties */}
          <div>
            <h4 className="font-semibold mb-2">Penalties</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="border rounded p-3">
                <p className="text-xs text-gray-600">Late Fee</p>
                <p className="font-bold">${contract.terms.penalties.lateFee}/day</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-xs text-gray-600">Damage Fee</p>
                <p className="font-bold">${contract.terms.penalties.damageFee}</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-xs text-gray-600">Cancellation Fee</p>
                <p className="font-bold">${contract.terms.penalties.cancellationFee}</p>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <h4 className="font-semibold mb-2">Conditions</h4>
            <ul className="space-y-1">
              {contract.terms.conditions.map((condition, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Contract Milestones</h3>
        <div className="space-y-3">
          {contract.milestones.map((milestone, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                milestone.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                milestone.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {milestone.completed ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{milestone.name}</p>
                {milestone.timestamp && (
                  <p className="text-xs text-gray-600">
                    {new Date(milestone.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
              {milestone.transactionHash && (
                <p className="text-xs font-mono text-gray-500">
                  {milestone.transactionHash.substring(0, 10)}...
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payments */}
      {contract.payments.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Payment History</h3>
          <div className="space-y-2">
            {contract.payments.map((payment, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold">{payment.type}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(payment.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${payment.amount}</p>
                  <p className="text-xs text-gray-600">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputes */}
      {contract.disputes.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Disputes</h3>
          <div className="space-y-3">
            {contract.disputes.map((dispute, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold">Dispute #{index + 1}</p>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {dispute.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{dispute.reason}</p>
                {dispute.resolution && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-xs text-gray-600">Resolution:</p>
                    <p className="text-sm">{dispute.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManager;
