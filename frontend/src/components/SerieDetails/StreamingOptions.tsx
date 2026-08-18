function StreamingOptions({
  serie_id,
  serie_name,
}: {
  serie_id: number;
  serie_name: string;
}) {
  serie_id;
  serie_name;
  return (
    <div className="h-full w-1/4 min-w-[400px] py-2 px-4 bg-gray-900/50 rounded-2xl flex flex-col text-xl text-gray-200 gap-2">
      <h1 className="h-6">streaming options :</h1>
      <div className="container h-[98%] flex items-center justify-center rounded-3xl bg-black/60">
        {/* should add some streaming options in some react reusable components */}
        <h2 className="text-center rotate-30">Not implimented yet</h2>
      </div>
    </div>
  );
}

export default StreamingOptions;
