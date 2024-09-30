import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createApp, App as VueApp } from 'vue';
import timerView from "./timer.vue"


import PomodoroTimerPlugin from "./main";


export const VIEW_TIMER: string = 'Timer';


export class TimerView extends ItemView {
    plugin: PomodoroTimerPlugin;
    vueapp: VueApp;

    constructor(leaf: WorkspaceLeaf, plugin: PomodoroTimerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType(): string {
        return VIEW_TIMER;
    }
    getDisplayText(): string {
        return "番茄时钟";
    }
    getIcon(): string {
        return "clock-10";
    }
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        const contentEl = container.createEl("div", {
            cls: "Pomodoro-timer"
        })

        this.vueapp = createApp(timerView);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(contentEl);
    }
    async onClose() {
        this.vueapp.unmount();
    }

}



import { App, Modal } from "obsidian";

export class ExampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.setText("Look at me, I'm a modal! 👀");
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}


import { MarkdownRenderChild } from "obsidian";
import * as timers from "timers";

export class Emoji extends MarkdownRenderChild {
    static ALL_EMOJIS: Record<string, string> = {
        ":+1:": "👍",
        ":sunglasses:": "😎",
        ":smile:": "😄",
    };

    text: string;

    constructor(containerEl: HTMLElement, text: string) {
        super(containerEl);

        this.text = text;
    }

    onload() {
        const emojiEl = this.containerEl.createSpan({
            text: Emoji.ALL_EMOJIS[this.text] ?? this.text,
        });
        this.containerEl.replaceWith(emojiEl);
    }
}
