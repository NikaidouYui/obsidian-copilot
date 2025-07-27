import ProjectManager from "@/LLMProviders/projectManager";
import { isProjectMode } from "@/aiParams";
import { createGetFileTreeTool } from "@/tools/FileTreeTools";
import { indexTool, localSearchTool, webSearchTool } from "@/tools/SearchTools";
import {
  getCurrentTimeTool,
  getTimeInfoByEpochTool,
  getTimeRangeMsTool,
  pomodoroTool,
  TimeInfo,
} from "@/tools/TimeTools";
import { simpleYoutubeTranscriptionTool } from "@/tools/YoutubeTools";
import { ToolManager } from "@/tools/toolManager";
import { extractAllYoutubeUrls, extractChatHistory } from "@/utils";
import { Vault } from "obsidian";
import { BrevilabsClient } from "./brevilabsClient";

// TODO: Add @index with explicit pdf files in chat context menu
export const COPILOT_TOOL_NAMES = ["@vault", "@composer", "@websearch", "@youtube", "@pomodoro"];

type ToolCall = {
  tool: any;
  args: any;
};

export class IntentAnalyzer {
  private static tools: any[] = [];

  static initTools(vault: Vault) {
    if (this.tools.length === 0) {
      this.tools = [
        getCurrentTimeTool,
        getTimeInfoByEpochTool,
        getTimeRangeMsTool,
        localSearchTool,
        indexTool,
        pomodoroTool,
        webSearchTool,
        simpleYoutubeTranscriptionTool,
        createGetFileTreeTool(vault.getRoot()),
      ];
    }
  }

  static async analyzeIntent(originalMessage: string): Promise<ToolCall[]> {
    // Bypass Broca intent analysis
    return [];
  }

  private static async processAtCommands(
    originalMessage: string,
    processedToolCalls: ToolCall[],
    context: {
      timeRange?: { startTime: TimeInfo; endTime: TimeInfo };
      salientTerms: string[];
    }
  ): Promise<void> {
    const message = originalMessage.toLowerCase();
    const { timeRange, salientTerms } = context;

    // Handle @vault command
    if (message.includes("@vault") && (salientTerms.length > 0 || timeRange)) {
      // Remove all @commands from the query
      const cleanQuery = this.removeAtCommands(originalMessage);

      processedToolCalls.push({
        tool: localSearchTool,
        args: {
          timeRange: timeRange || undefined,
          query: cleanQuery,
          salientTerms,
        },
      });
    }

    // Handle @websearch command and also support @web for backward compatibility
    if (message.includes("@websearch") || message.includes("@web")) {
      const cleanQuery = this.removeAtCommands(originalMessage);
      const memory = ProjectManager.instance.getCurrentChainManager().memoryManager.getMemory();
      const memoryVariables = await memory.loadMemoryVariables({});
      const chatHistory = extractChatHistory(memoryVariables);

      processedToolCalls.push({
        tool: webSearchTool,
        args: {
          query: cleanQuery,
          chatHistory,
        },
      });
    }

    // Handle @pomodoro command
    if (message.includes("@pomodoro")) {
      const pomodoroMatch = originalMessage.match(/@pomodoro\s+(\S+)/i);
      const interval = pomodoroMatch ? pomodoroMatch[1] : "25min";
      processedToolCalls.push({
        tool: pomodoroTool,
        args: { interval },
      });
    }

    // Auto-detect YouTube URLs (handles both @youtube command and auto-detection)
    const youtubeUrls = extractAllYoutubeUrls(originalMessage);
    for (const url of youtubeUrls) {
      // Check if we already have a YouTube tool call for this URL
      const hasYoutubeToolForUrl = processedToolCalls.some(
        (tc) => tc.tool.name === simpleYoutubeTranscriptionTool.name && tc.args.url === url
      );

      if (!hasYoutubeToolForUrl) {
        processedToolCalls.push({
          tool: simpleYoutubeTranscriptionTool,
          args: { url },
        });
      }
    }
  }

  private static removeAtCommands(message: string): string {
    return message
      .split(" ")
      .filter((word) => !COPILOT_TOOL_NAMES.includes(word.toLowerCase()))
      .join(" ")
      .trim();
  }
}
