import { H1 } from "./header.js";

let Menu = ({ children }) => (
	<view>
		<H1>Preact Devtools Demos</H1>
		<view>{children}</view>
	</view>
);

export default Menu;
