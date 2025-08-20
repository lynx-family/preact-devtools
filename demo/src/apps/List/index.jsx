/* eslint-disable react/no-unknown-property */

import { Component } from "@lynx-js/react";

import "./index.css";

class Foo extends Component {
	/**
	 * @override
	 */
	render() {
		return (
			<view style="border-width: 5px; border-color: green; width: 100%; height: 100px; background-color: yellow">
				<text>item-key: {this.props.name}</text>
			</view>
		);
	}
}

class Bar extends Component {
	/**
	 * @override
	 */
	render() {
		return (
			<view style="border-width: 5px; border-color: green; width: 100%; height: 200px; background-color: orange">
				<text>item-key: {this.props.name}</text>
			</view>
		);
	}
}

export default class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			data0: Array.from(Array(100).keys()),
			listType: "single",
			columnCount: 1,
		};
	}

	increaseColumnCount() {
		this.setState({
			columnCount: this.state.columnCount + 1,
		});
	}
	decreaseColumnCount() {
		this.setState({
			columnCount: this.state.columnCount - 1,
		});
	}
	changeListTypeToSingle() {
		this.setState({
			listType: "single",
		});
	}
	changeListTypeToWaterfall() {
		this.setState({
			listType: "waterfall",
		});
	}
	changeListTypeToFlow() {
		this.setState({
			listType: "flow",
		});
	}

	/**
	 * @override
	 */
	render() {
		const items = [
			<list-item key="header1" item-key="header1" sticky-top={true} full-span>
				<Foo name="header1" />
			</list-item>,
		];

		this.state.data0 &&
			this.state.data0.map((item, index) => {
				if (index % 2 == 0) {
					items.push(
						<list-item
							key={item + ""}
							item-key={item + ""}
							full-span
							sticky-top={false}
						>
							<Foo name={item + ""} />
						</list-item>,
					);
				} else {
					items.push(
						<list-item key={item + ""} item-key={item + ""} sticky-top={false}>
							<Bar name={item + ""} />
						</list-item>,
					);
				}
			});

		return (
			<view style={{ flexDirection: "column" }} className="container">
				<text style="height: 50px">Start of a List</text>
				<list
					sticky={true}
					list-type={this.state.listType}
					column-count={this.state.columnCount}
					style="height: 500px; width: 100%"
				>
					{items}
					<list-item
						key="footer0"
						item-key="footer0"
						sticky-bottom={true}
						full-span
					>
						<Foo name="footer0" />
					</list-item>
				</list>

				<view
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						columnCount: {this.state.columnCount}
					</text>
				</view>

				<view
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						listType: {this.state.listType}
					</text>
				</view>

				<view
					bindtap={this.changeListTypeToSingle.bind(this)}
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						Change listType to single
					</text>
				</view>

				<view
					bindtap={this.changeListTypeToWaterfall.bind(this)}
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						Change listType to waterfall
					</text>
				</view>

				<view
					bindtap={this.changeListTypeToFlow.bind(this)}
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						Change listType to flow
					</text>
				</view>

				<view
					bindtap={this.increaseColumnCount.bind(this)}
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						Reduce columnCount
					</text>
				</view>

				<view
					bindtap={this.decreaseColumnCount.bind(this)}
					style="width:100%;height: 100px;border-width:2px; border-color: blue"
					flatten="false"
				>
					<text className="blockText" flatten="false">
						Reduce columnCount
					</text>
				</view>
			</view>
		);
	}
}
