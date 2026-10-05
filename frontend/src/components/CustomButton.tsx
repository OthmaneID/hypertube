function CustomButton({ text, onClick, content }: { text: string; onClick: () => void; content?: React.ReactNode }) {
    
    return (
      <div>
        <span
          className="group peer flex flex-row gap-2 items-center justify-center text-4xl bg-gray-500/60 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-500/70 active:scale-105 duration-300"
          title={text}
          onClick={() => {
            onClick();
          }}
        >
          {content}
        </span>
        <span className="text-sm opacity-0 peer-hover:opacity-100 transition-opacity duration-200">
          {text}
        </span>
      </div>
    );
}

export default CustomButton;