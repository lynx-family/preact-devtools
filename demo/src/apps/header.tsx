export function H1(props: { children: any }) {
	return (
		<text
			style={{
				fontSize: "20px",
				fontWeight: "bold",
			}}
		>
			{props.children}
		</text>
	);
}

export function H2(props: { children: any }) {
	return (
		<text
			style={{
				fontSize: "15px",
				fontWeight: "bold",
			}}
		>
			{props.children}
		</text>
	);
}

export function H3(props: { children: any }) {
	return (
		<text
			style={{
				fontSize: "11.7px",
				fontWeight: "bold",
			}}
		>
			{props.children}
		</text>
	);
}
