// @ts-nocheck

import { useState } from "@lynx-js/react";

function Display(props) {
	return (
		<view data-testid="result">
			<text>Counter: {props.value}</text>
		</view>
	);
}

export default function Counter() {
	const [v, set] = useState(0);

	return (
		<view style="padding: 0 2rem;">
			<Display value={v} />
			<view
				bindtap={() => {
					set(v + 1);
				}}
			>
				<text
					style={{
						padding: "10px 20px",
						marginTop: "10px",
						backgroundColor: "#007bff",
						color: "#fff",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						textAlign: "center",
						textDecoration: "none",
						userSelect: "none",
					}}
				>
					Increment
				</text>
			</view>
		</view>
	);
}

// render(<Counter />, document.getElementById("app"));
