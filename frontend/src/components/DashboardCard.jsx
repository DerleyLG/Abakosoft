const DashboardCard = ({ title, value, className }) => {
  return (
    <div className={`bg-white rounded shadow p-4 flex flex-col items-center ${className}`}>
      <h3 className= "p-4 text-gray-700 font-semibold mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};



export default DashboardCard
