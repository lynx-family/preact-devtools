// @ts-nocheck
import { useState } from "preact/hooks";
import Menu from "./apps/Menu.js";

import Counter from "./apps/Counter/index.jsx";
import CounterAuto from "./apps/Counter/auto.jsx";
import ListSimple from "./apps/List/simple.jsx";
import List from "./apps/List/index.jsx";
import SnapshotProps from "./apps/SnapshotProps/index.jsx";

const ComponentMap: Record<string, any> = {
	Counter,
	CounterAuto,
	ListSimple,
	List,
	SnapshotProps,
};
export function ComponentSwitcher() {
	const [componentName, setComponentName] = useState("Counter");
	const Component = ComponentMap[componentName];
	return (
		<view
			style={{
				margin: "12px",
				marginTop: "48px",
				display: "flex",
				flexDirection: "column",
				height: "100%",
			}}
		>
			<Menu>
				<view
					style={{
						margin: "12px",
					}}
				>
					{Object.entries(ComponentMap).map(([demoName]) => (
						<view key={demoName}>
							<text
								bindtap={() => {
									setComponentName(demoName);
								}}
								style={{
									fontSize: "18px",
									padding: "2px",
									color: "blue",
									textDecoration: "underline",
								}}
							>
								▷ {demoName}
							</text>
						</view>
					))}
				</view>
			</Menu>
			<scroll-view
				style={{
					flex: 1,
					paddingBottom: "240px",
				}}
				scroll-y
			>
				{Component && <Component />}
			</scroll-view>
		</view>
	);
}

export function App() {
	return <ComponentSwitcher />;
}
