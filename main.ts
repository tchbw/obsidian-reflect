import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/resources/index.mjs";
import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
  } from "obsidian";
  
  /** Define the plugin’s settings. */
  interface ReflectiveJournalSettings {
    claudeApiKey: string;
  }
  
  /** Default settings if none are stored yet. */
  const DEFAULT_SETTINGS: ReflectiveJournalSettings = {
    claudeApiKey: "",
  };
  
  export default class ReflectiveJournalPlugin extends Plugin {
    settings: ReflectiveJournalSettings;
  
    async onload() {
      console.log("Loading Reflective Journal Plugin...");
  
      // Load settings from disk
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  
      // Add the settings tab in Obsidian
      this.addSettingTab(new ReflectiveJournalSettingTab(this.app, this));
  
      // Add a command to Obsidian's command palette
      this.addCommand({
        id: "reflect-button",
        name: "Reflect",
        callback: async () => {
          // Get the current active Markdown editor
          const currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!currentView) {
            new Notice("No active markdown editor found.");
            return;
          }
  
          // Get the current document text
          const docContent = currentView.editor.getValue();
  
          // Call Claude API to get a reflective journaling prompt
          const suggestedQuestion = await this.getSuggestedQuestion(docContent);
  
          // If we successfully got a question, insert it as a blockquote
          if (suggestedQuestion) {
            // Insert as a block quote at the current cursor position
            const formattedQuestion = suggestedQuestion.split('\n').map(line => `> ${line}`).join('\n');
            currentView.editor.replaceSelection(formattedQuestion + '\n\n\n');

            new Notice("Reflective question inserted!");
          } else {
            new Notice("Failed to fetch reflective question.");
          }
        },
      });
    }
  
    /** Unload lifecycle hook. */
    onunload() {
      console.log("Unloading Reflective Journal Plugin...");
    }
  
    /** Save settings to disk. */
    async saveSettings() {
      await this.saveData(this.settings);
    }
  
    /**
     * Calls Anthropic's Claude API to get a reflective journaling question.
     * Adjust the model, prompt, and parameters according to your needs.
     */
    private async getSuggestedQuestion(documentText: string): Promise<string | null> {
      try {
        if (!this.settings.claudeApiKey) {
          new Notice("No Claude API key set. Please go to plugin settings.");
          return null;
        }
  
        const system = `
        You are a helpful journaling assistant that helps the user reflect while they journal.
        You will be given a user's journal entry as markdown. Blockquotes represent past reflection questions asked by you.
        Your job is to read the journal and suggest a reflection question to further stimulate the writer's thoughts and guide their thinking.
        Return the reflection question in raw text and not a markdown blockquote.
        `;
        const prompt = `
        Suggest the reflection question for this journal:

        ${documentText}
        `;

  
        //meow
        const anthropic = new Anthropic({
            apiKey: this.settings.claudeApiKey,
            dangerouslyAllowBrowser: true
        });

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            system: system,
            max_tokens: 1024,
            messages: [
              {"role": "user", "content": prompt}
            ]
          });

        const content = response.content[0] as TextBlock
        return content.text 
      } catch (error) {
        console.error("Error calling Claude API: ", error);
        return error;
      }
    }
  }
  
  /** Settings tab for storing the user’s Claude API key. */
  class ReflectiveJournalSettingTab extends PluginSettingTab {
    plugin: ReflectiveJournalPlugin;
  
    constructor(app: App, plugin: ReflectiveJournalPlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }
  
    display(): void {
      const { containerEl } = this;
      containerEl.empty();
  
      containerEl.createEl("h2", { text: "Reflective Journal Plugin Settings" });
  
      // Text field for the user to enter their Claude API key
      new Setting(containerEl)
        .setName("Claude API Key")
        .setDesc("Enter your Anthropic Claude API key.")
        .addText((text) =>
          text
            .setPlaceholder("Enter your key")
            .setValue(this.plugin.settings.claudeApiKey)
            .onChange(async (value) => {
              this.plugin.settings.claudeApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }
  }