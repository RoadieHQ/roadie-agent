import fetch from 'node-fetch';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';
import { JsonValue, ScaffolderActionContext } from '$/types';
import { AGENT_SCAFFOLDER_LOG_PATH } from '@/scaffolderAction/constants';


export class CustomScaffolderActionContext implements ScaffolderActionContext {
  private readonly brokerClientUrl: string;
  private readonly logger: BaseLogger;
  private readonly actionId: string;
  private readonly outputs: Record<string, unknown> = {};

  readonly workspacePath: string;
  readonly payload: { body: Record<string, JsonValue> };

  constructor({
    brokerClientUrl,
    actionId,
    payload,
  }: {
    brokerClientUrl: string;
    actionId: string;
    payload: {
      body: Record<string, JsonValue>;
      localWorkspacePath: string;
    };
  }) {
    this.brokerClientUrl = brokerClientUrl;
    this.actionId = actionId;
    this.payload = { body: payload.body };
    this.workspacePath = payload.localWorkspacePath;
    this.logger = getLogger('RoadieAgentForwarder');
  }

  async log(content: string, context?: Record<string, string>) {
    const url = `${this.brokerClientUrl}/${AGENT_SCAFFOLDER_LOG_PATH}/${this.actionId}`;
    const body = JSON.stringify({
      content,
      context,
      actionId: this.actionId,
    });
    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    try {
      const responseBody = await response.text();
      this.logger.info(
        `Received response from scaffolder logger. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
      );
    } catch (e) {
      this.logger.debug(e);
      this.logger.warn(
        `No Response received from scaffolder logger. Status: ${response?.status}, ${response?.statusText}.`,
      );
    }
  }

  output(name: string, value: unknown) {
    this.outputs[name] = value;
  }

  getOutputs(): Record<string, unknown> {
    return this.outputs;
  }
}
