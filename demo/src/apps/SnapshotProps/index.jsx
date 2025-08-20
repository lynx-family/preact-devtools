export const View = props => {
	return (
		<view>
			<text>View</text>
			{props.child}
		</view>
	);
};

export default function SnapshotProps() {
	const child = <text>child</text>;

	return <View child={child} />;
}
