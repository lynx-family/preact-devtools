export const Button = ({ onClick, children }) => {
	return (
		<text
			style={{
				padding: "10px",
				backgroundColor: "#eee",
				borderRadius: "5px",
				border: "1px solid #ccc",
				width: "fit-content",
			}}
			bindtap={onClick}
		>
			{children}
		</text>
	);
};
