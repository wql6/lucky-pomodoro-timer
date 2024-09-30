import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf
} from 'obsidian';

import {
	VIEW_TIMER,
	TimerView,
	ExampleModal, Emoji
} from './view'

interface PomodoroTimerPluginSettings {
	pomodoroFolder: string;
	focusSlogan: string;
	relaxSlogan: string;
	keepTime: number;
	relaxTime: number;
}

const DEFAULT_SETTINGS: PomodoroTimerPluginSettings = {
	pomodoroFolder: "pomodoro",
	focusSlogan: "专注中",
	relaxSlogan: "休息中",
	keepTime: 25,
	relaxTime: 5,
}

export var gsetting = DEFAULT_SETTINGS;

export default class PomodoroTimerPlugin extends Plugin {
	settings: PomodoroTimerPluginSettings;

	async onload() {
		await this.loadSettings();

		console.log("load Pomodoro Calendar")


		this.registerView(
			VIEW_TIMER,
			(leaf: WorkspaceLeaf) => new TimerView(leaf, this)
		);

		// 这添加了一个设置选项卡，以便用户可以配置插件的各个方面
		this.addSettingTab(new PomodoroSettingTab(this.app, this));

		this.addCommand({
			id: 'Pomodoro-timer',
			name: '打开Lucky pomodoro timer ',
			callback: () => {
				this.activateViewTimer()
				// this.view.onOpen()
			}
		});


		this.registerMarkdownPostProcessor((element, context) => {
			const codeblocks = element.querySelectorAll("code");

			for (let index = 0; index < codeblocks.length; index++) {
				const codeblock = codeblocks.item(index);
				const text = codeblock.innerText.trim();
				const isEmoji = text[0] === ":" && text[text.length - 1] === ":";

				if (isEmoji) {
					context.addChild(new Emoji(codeblock, text));
				}
			}
		});


	}

	onunload() {

	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		gsetting = this.settings;
	}

	async saveSettings() {
		gsetting = this.settings;
		await this.saveData(this.settings);
	}

	async activateViewTimer() {
		if (this.app.workspace.getLeavesOfType(VIEW_TIMER).length === 0) {
			const newLeaf = this.app.workspace.getLeaf(true); // 创建一个新的窗口
			await newLeaf.setViewState({
				type: VIEW_TIMER,
				active: true,
			})
		}

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TIMER)[0]
		)
	}
}


// 插件设置
class PomodoroSettingTab extends PluginSettingTab {
	plugin: PomodoroTimerPlugin;

	constructor(app: App, plugin: PomodoroTimerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('番茄钟保存路径') 		// 设置名称
			.setDesc('番茄钟生成的文件保存的路径。默认为`pomodoro`')	// 设置描述
			.addText(text => text
				.setPlaceholder('例如文件夹1/文件夹2')
				.setValue(this.plugin.settings.pomodoroFolder)
				.onChange(async (value) => {
					this.plugin.settings.pomodoroFolder = value;
					gsetting.pomodoroFolder = this.plugin.settings.pomodoroFolder;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('专注文案') 		// 设置名称
			.setDesc('给自己专注录入一段醒目文案，默认为`专注中`')	// 设置描述
			.addText(text => text
				.setPlaceholder('鼓励自己一段话')
				.setValue(this.plugin.settings.focusSlogan)
				.onChange(async (value) => {
					this.plugin.settings.focusSlogan = value;
					gsetting.focusSlogan = this.plugin.settings.focusSlogan;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('休息文案') 		// 设置名称
			.setDesc('给自己专注录入一段醒目文案，默认为`休息中`')	// 设置描述
			.addText(text => text
				.setPlaceholder('休养生息')
				.setValue(this.plugin.settings.relaxSlogan)
				.onChange(async (value) => {
					this.plugin.settings.relaxSlogan = value;
					gsetting.relaxSlogan = this.plugin.settings.relaxSlogan;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('专注时长(分钟)') 		// 设置名称
			.setDesc('专注时长，默认为25分钟')	// 设置描述
			.addText(text => text
				.setPlaceholder('25')
				.setValue(String(this.plugin.settings.keepTime)) // 将数字转换为字符串
				.onChange(async (value) => {
					const newValue = Number(value);
					if (newValue > 0) { // 确保值大于0
						this.plugin.settings.keepTime = newValue;
						gsetting.keepTime = this.plugin.settings.keepTime;
						await this.plugin.saveSettings();
					}
				})
				.inputEl.type = 'number' // 限制输入为数字
			);

		new Setting(containerEl)
			.setName('休息时长(分钟)') 		// 设置名称
			.setDesc('休息时长，默认为5分钟')	// 设置描述
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.relaxTime)) // 将数字转换为字符串
				.onChange(async (value) => {
					const newValue = Number(value);
					if (newValue >= 0) { // 确保值大于0
						this.plugin.settings.relaxTime = newValue;
						gsetting.relaxTime = this.plugin.settings.relaxTime;
						await this.plugin.saveSettings();
					}
				})
				.inputEl.type = 'number' // 限制输入为数字
			);
	}
}
