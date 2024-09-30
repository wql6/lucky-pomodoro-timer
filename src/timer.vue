<template>
	<div>
		<div class="current_div">
			<button class="icon-button" @click="startTimer" ref="statusButton"></button>
			<ul>
				<li>{{ tStatus }}</li>
				<li>{{ formattedTime }}</li>
			</ul>
			<span class="right-text">{{focusText}}</span>
		</div>

		<div class="summary_div">
			<div class="summary_div_item">
				<ul>
					<li>{{ toDayP }}</li>
					<li>今日番茄数</li>
					<li>相比昨天{{increaseCount}}</li>
				</ul>

				<ul>
						<li>{{ totalP }}</li>
						<li>总番茄数</li>
						<li></li>
				</ul>

				<ul>
						<li>{{ todayFocusPeriod }}h</li>
						<li>专注时长</li>
						<li></li>
				</ul>

				<ul>
						<li>{{ totalFocusPeriod }}h</li>
						<li>总专注时长</li>
						<li></li>
				</ul>

			</div>
		</div>
		<canvas ref="myChart"  style="width: 100%; height: 100%;"></canvas>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import {App, TFile, setIcon, MarkdownView} from 'obsidian';
import { ready, working, finish, relax } from './constants'; // 导入变量
import { gsetting } from './main';



// Register Chart.js components
Chart.register(...registerables);


const keepTime = gsetting.keepTime * 60
const relaxTime = gsetting.relaxTime * 60

// 使用 ref 创建响应式数据
enum Status {
    START_FOCUS = 1,
    FOCUSING = 2,
    FOCUS_COMPLETE = 3,
    START_REST = 4,
    RESTING = 5,
    REST_COMPLETE = 6
}


const curStatus = ref(Status.START_FOCUS)  // 1-开始专注， 2-专注，3-专注完成， 4-开始休息 ，5-休息中，6-休息完成

const myChart = ref<HTMLCanvasElement | null>(null);
// const timer = ref<number>(30 * 60); // Initial time in seconds (30 minutes)
const timer = ref<number>(keepTime); // Initial time in seconds (30 minutes)
const intervalId = ref<number | null>(null); // Store interval ID
const focusText = ref<string>('开始专注');
const tStatus = ref<string>('专注');
const statusButton = ref<HTMLElement | null>(null); // 创建 ref 引用


// Format time as MM:SS
const formattedTime = computed(() => {
	const minutes = Math.floor(timer.value / 60);
	const seconds = timer.value % 60;
	return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
});


// Start or stop the timer
const startTimer = async () => {
	if (curStatus.value == Status.START_FOCUS) {
		curStatus.value = Status.FOCUSING;

		intervalId.value = window.setInterval(() => {
			if (timer.value > 0) {
				timer.value--;
			} else {
				clearInterval(intervalId.value!);
				intervalId.value = null;
				curStatus.value = Status.FOCUS_COMPLETE;
				timer.value = relaxTime;
			}
		}, 1000);

	} else if (curStatus.value == Status.FOCUS_COMPLETE) {
		curStatus.value = Status.RESTING;
		intervalId.value = window.setInterval(() => {
			if (timer.value > 0) {
				timer.value--;
			} else {
				clearInterval(intervalId.value!);
				intervalId.value = null;
				curStatus.value = 1;
				timer.value = keepTime;
				curStatus.value = Status.START_FOCUS;
			}
		}, 1000);
		await getPomodoroClockStats(); // 将 getPomodoroClockStats 放入异步函数中
	}
};


const stats = ref({
	total: 0,
	today: 0,
	yesterdayTotal: 0,
	todayTotalSeconds: 0,
	totalSeconds: 0,
	todayHourlyDurations: {},
	todayHourlyCounts: {}
});

const getPomodoroClockStats = async () => {
	console.log("更新getPomodoroClockStats的状态")
	try {
		// @ts-ignore
		const app = (window as any).app as App; // Access Obsidian App
		const vault = app.vault;


		const currentDate = new Date();
		const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
		const pomodoroFolder = gsetting.pomodoroFolder;
		const fileName = `${currentMonth}.md`;
		const filePath = `${pomodoroFolder}/${fileName}`;
		const fileExists = vault.getAbstractFileByPath(filePath) as TFile | null;

		if (!fileExists) {
			return { total: 0, today: 0, yesterdayTotal: 0, todayTotalSeconds: 0, totalSeconds: 0, todayHourlyDurations: {}, todayHourlyCounts: {} }; // File does not exist, so no records
		}

		// Read existing data
		const file = vault.getAbstractFileByPath(filePath) as TFile;
		const content = await vault.read(file);
		const jsonData = JSON.parse(content);

		// Filter records for today and yesterday
		const today = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD format
		const yesterday = new Date(currentDate);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD format

		const todayRecords = jsonData.filter((record: any) => record.date.startsWith(today));
		const yesterdayRecords = jsonData.filter((record: any) => record.date.startsWith(yesterdayStr));


		// Calculate hourly durations and counts
		const todayHourlyDurations: { [key: string]: number } = {};
		const todayHourlyCounts: { [key: string]: number } = {};



		// Initialize todayHourlyDurations and todayHourlyCounts for 24 hours
		for (let hour = 0; hour < 24; hour++) {
			const hourKey = `${hour}:00`;
			todayHourlyDurations[hourKey] = 0;
			todayHourlyCounts[hourKey] = 0;
		}


		let totalSeconds = 0;
		let todayTotalSeconds = 0;

		jsonData.forEach((record: any) => {
			const hour = new Date(record.date).getHours();
			const hourKey = `${hour}:00`;

			totalSeconds += record.duration;

			if (record.date.startsWith(today)) {
				todayTotalSeconds += record.duration;
				todayHourlyDurations[hourKey] += record.duration;
				todayHourlyCounts[hourKey] += 1;
			}
		});

		stats.value = {
			total: jsonData.length,
			today: todayRecords.length,
			yesterdayTotal: yesterdayRecords.length,
			todayTotalSeconds,
			totalSeconds,
			todayHourlyDurations,
			todayHourlyCounts
		}
		console.log("stats.value:", stats.value)

		return {
			total: jsonData.length,
			today: todayRecords.length,
			yesterdayTotal: yesterdayRecords.length,
			todayTotalSeconds,
			totalSeconds,
			todayHourlyDurations,
			todayHourlyCounts
		}; // Return total, today's count, yesterday's count, today's total seconds, total seconds, hourly durations, and hourly counts
	} catch (error) {
		console.error('Failed to get pomodoroClock stats:', error);
		return { total: 0, today: 0, yesterdayTotal: 0, todayTotalSeconds: 0, totalSeconds: 0, todayHourlyDurations: {}, todayHourlyCounts: {} };
	}
};


const totalP = computed(() => stats.value.total);
const toDayP = computed(() => stats.value.today);
const todayFocusPeriod = computed(() => (stats.value.todayTotalSeconds / 60 / 60).toFixed(1)); // 精确到小数点后1位
const totalFocusPeriod = computed(() => (stats.value.totalSeconds / 60 /60).toFixed(1)); // 使用 Math.floor 代替 parseInt
const increaseCount = computed(() => {
    const increaseCount = stats.value.today - stats.value.yesterdayTotal
	if(increaseCount > 0){
		return "上升" + increaseCount
	}else if(increaseCount < 0){
		return "下降" + increaseCount
	}else{
		return "持平"
	}
});

// @ts-ignore
const savePomodoroClockData = async () => {
	try {
		// @ts-ignore
		const app = (window as any).app as App; // Access Obsidian App
		const vault = app.vault;

		const currentDate = new Date();
		const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
		const pomodoroFolder = gsetting.pomodoroFolder;
		const fileName = `${currentMonth}.md`;
		const filePath = `${pomodoroFolder}/${fileName}`;
		const fileExists = vault.getAbstractFileByPath(filePath) as TFile | null;

		// Create folder if not exists
		let folder = vault.getAbstractFileByPath(pomodoroFolder);
		if (!folder) {
			await vault.createFolder(pomodoroFolder);
			folder = vault.getAbstractFileByPath(pomodoroFolder);
		}

		// Create file if not exists
		if (!fileExists) {
			await vault.create(filePath, JSON.stringify([]));
		}

		// Read existing data
		const file = vault.getAbstractFileByPath(filePath) as TFile;
		const content = await vault.read(file);
		const jsonData = JSON.parse(content);


		// Add new record
		jsonData.push({
			date: currentDate.toISOString(),
			duration: keepTime - timer.value, // Duration in seconds
			status: tStatus.value === '休息' ? 2 : 1
		});

		// Write updated data
		await vault.modify(file, JSON.stringify(jsonData, null, 2));

	} catch (error) {
		console.error('Failed to save pomodoroClock data:', error);
	}
};


const updateChartData = () => {
	console.log("更新图标数据", stats.value.todayHourlyCounts)
	if (dataChart) {
		dataChart.data.datasets[0].data = Object.values(stats.value.todayHourlyCounts);
		dataChart.update();
		dataChart.show
	}
};



const chartData =  {
					labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
					datasets: [{
						label: '每小时番茄统计数',
						data: Object.values(stats.value.todayHourlyCounts), // 模拟数据
						backgroundColor: [
							'rgba(54, 162, 235, 1)', // 蓝色
							/*'rgba(255, 99, 132, 1)', // 红色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)'  // 橙色*/
						],
						borderColor: [
							'rgba(54, 162, 235, 1)', // 蓝色
							/*'rgba(255, 99, 132, 1)', // 红色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)', // 橙色
							'rgba(255, 99, 132, 1)', // 红色
							'rgba(54, 162, 235, 1)', // 蓝色
							'rgba(255, 206, 86, 1)', // 黄色
							'rgba(75, 192, 192, 1)', // 青色
							'rgba(153, 102, 255, 1)', // 紫色
							'rgba(255, 159, 64, 1)'  // 橙色*/
						],
						borderWidth: 1,
						borderRadius: 2,
						responsive: true,
						maintainAspectRatio: true // 允许自由调整比例
					}]
				};




let dataChart: Chart;


onMounted(async () => {
	console.log("onMounted===========")
	await getPomodoroClockStats();
	chartData.datasets[0].data = Object.values(stats.value.todayHourlyCounts);
	setIcon(statusButton.value, ready, 14); // 切换图标

	if (myChart.value) {
		const ctx = myChart.value.getContext('2d');
		if (ctx) {
			dataChart = new Chart(ctx, {
				type: 'bar',
				data: chartData,
				options: {
					plugins: {
						legend: {
							labels: {
								color: '#000000' // 设置标签颜色
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							title: {
								display: true,
								text: '番茄数', // y轴注释
							},
							grid: {
								display: false // 去掉背景的竖线
							}
						},
						x: {
							title: {
								display: true,
								text: '小时', // x轴注释
							},
							grid: {
								display: false // 去掉背景的竖线
							}
						}
					}
				}
			});
		}
	}
});

// 监视 stats 的变化以更新图表
watch(stats, () => {
	updateChartData();
});

watch(curStatus, (newStatus: number) => {
	switch(Number(newStatus)){
		case Status.START_FOCUS:
			setIcon(statusButton.value, ready, 14); // 切换图标
			focusText.value = '开始专注'
			tStatus.value = '专注';
			break;
		case Status.FOCUSING:
			setIcon(statusButton.value, working, 14); // 切换图标
			focusText.value = gsetting.focusSlogan
			tStatus.value = '专注';
			break;
		case Status.FOCUS_COMPLETE:
			// 将 await 放入异步函数中
			(async () => {
				await savePomodoroClockData();
				getPomodoroClockStats();
			})();
			setIcon(statusButton.value, finish, 14); // 切换图标
			focusText.value = '开始休息'
			tStatus.value = '休息';
			break;
		case Status.RESTING:
			setIcon(statusButton.value, relax, 14); // 切换图标
			focusText.value = gsetting.relaxSlogan;
			tStatus.value = '休息';
			break;
	}
})


setTimeout(() => {
	const style = getComputedStyle(document.body); // 或者选择其他具体元素
	const bgDivValue = style.getPropertyValue('--bg-div').trim();
	const textColor = style.getPropertyValue('--text-color-dark').trim();
	console.log('Background color:', bgDivValue);
	console.log('textColor:==', textColor);
	if(dataChart){
		dataChart.options.scales.x.ticks.color = textColor
		dataChart.options.scales.y.ticks.color = textColor
		dataChart.options.scales.x.title.color = textColor // 设置 x 轴标题颜色
		dataChart.options.scales.y.title.color = textColor // 设置 y 轴标题颜色
		dataChart.options.plugins.legend.labels.color = textColor // 设置 y 轴标题颜色


		dataChart.update()
	}
}, 500); // 0毫秒的延迟


</script>

<style scoped lang="scss">

@import 'styles/common.scss';
@import 'styles/colors.css';



.current_div {
	width: 100%;
	margin: 20px 30px 15px 5px;
	border-radius: 10px;
	background-color: var(--bg-div);
	padding: 15px;

	display: flex;
	justify-content: start;
	align-items: center;

	ul {
		margin-left: $item-mar-left;

		li {
			font-size: $small-font-size;
			&:last-child {
				margin-bottom: 0;
				font-size: $middle-font-size;
			}
		}
	}

	span{
		margin-left: $item-mar-left;
	}

}

.summary_div {
	width: 100%;
	margin: 20px 30px 15px 5px;
	border-radius: 10px;
	background-color: var(--bg-div);
	padding: 15px;

	display: flex;
	justify-content: start;
	align-items: center;

	.summary_div_item {
		display: flex;
		flex-direction: start;
		align-items: flex-start;
		gap: $item-mar-left;

		ul{
			display: flex;
			flex-direction: column; // 垂直排列
			justify-content: center; // 垂直居中
			align-items: center; // 水平居中
			height: 100%; // 确保有足够的高度


			li:nth-child(2) {
				font-size: $small-font-size;
			}

			li:nth-child(3) {
				font-size: $ss-font-size;
			}

		}
	}
}

.icon-button {
  width: 40px; // 设置宽度
  height: 40px; // 设置高度
  display: flex; // 使内容居中
  justify-content: center; // 使内容居中
  align-items: center; // 使内容居中
  border-radius: 50%; // 设置为圆形
}



</style>
