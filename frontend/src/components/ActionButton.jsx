const ActionButton = ({ text }) => {
  return (
    <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition">
      {text}
    </button>
  )
}

export default ActionButton
