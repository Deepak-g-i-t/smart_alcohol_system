// Authority - All Transactions View
import { useData } from '../../contexts/DataContext';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { ClipboardList, Download } from 'lucide-react';

export default function AuthorityTransactions() {
  const { transactions } = useData();

  const columns = [
    {
      id: 'id',
      header: 'Transaction ID',
      accessor: 'id',
      cell: (row) => <span className="font-mono text-xs text-accent-cyan">{row.id}</span>,
      width: '140px',
    },
    {
      id: 'buyer',
      header: 'Buyer',
      accessor: 'buyerName',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-dark-200">{row.buyerName}</p>
          <p className="text-xs text-dark-400">{row.buyerId}</p>
        </div>
      ),
    },
    {
      id: 'shop',
      header: 'Shop',
      accessor: 'shopName',
      cell: (row) => <span className="text-sm text-dark-300">{row.shopName}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      accessor: 'alcoholType',
    },
    {
      id: 'qty',
      header: 'Qty',
      accessor: 'quantity',
      width: '60px',
    },
    {
      id: 'amount',
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => <span className="font-medium">₹{row.amount}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'reason',
      header: 'Reason',
      accessor: 'reason',
      cell: (row) => row.reason ? (
        <span className="text-xs text-accent-red">{row.reason}</span>
      ) : (
        <span className="text-xs text-dark-500">—</span>
      ),
    },
    {
      id: 'timestamp',
      header: 'Time',
      accessor: (row) => new Date(row.timestamp).toISOString(),
      cell: (row) => (
        <span className="text-xs text-dark-400">
          {new Date(row.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">All Transactions</h1>
            <p className="text-sm text-dark-400">{transactions.length} total records</p>
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        pageSize={12}
        searchPlaceholder="Search by buyer, shop, type, or ID..."
      />
    </div>
  );
}
