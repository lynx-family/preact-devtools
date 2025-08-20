export const Item = ({ text }) => {
	return (
		<view style="border-width: 5px; border-color: green; width: 100%; height: 100px; background-color: orange">
			<text>item: {text}</text>
		</view>
	);
};

export default function ListSimple() {
	return (
		<view>
			<list style="height: 500px; width: 100%">
				{Array(100)
					.fill(0)
					.map((_item, index) => (
						<list-item key={index} item-key={index}>
							<Item text={index} />
						</list-item>
					))}
			</list>
		</view>
	);
}
