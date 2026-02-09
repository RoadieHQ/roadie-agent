import * as nodeFetchModule from 'node-fetch';
import sinon from 'sinon';
import { expect } from 'chai';
import { CustomScaffolderActionContext } from '../CustomScaffolderActionContext';
import { AGENT_SCAFFOLDER_LOG_PATH } from '../constants';

describe('CustomScaffolderActionContext', () => {
  let fetchStub: sinon.SinonStub;
  const brokerClientUrl = 'http://broker.url';
  const actionId = 'test-action-id';
  const localWorkspacePath = '/tmp/workspace';
  const payload = { body: { key: 'value' }, localWorkspacePath };

  beforeEach(() => {
    fetchStub = sinon.stub(nodeFetchModule, 'default' as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize correctly', () => {
    const context = new CustomScaffolderActionContext({
      brokerClientUrl,
      actionId,
      payload,
    });

    expect(context.workspacePath).to.equal(localWorkspacePath);
    expect(context.payload.body).to.deep.equal({ key: 'value' });
    expect(context.getOutputs()).to.deep.equal({});
  });

  it('should log to the correct URL', async () => {
    fetchStub.resolves({
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
    } as any);

    const context = new CustomScaffolderActionContext({
      brokerClientUrl,
      actionId,
      payload,
    });

    await context.log('test log message', { step: '1' });

    sinon.assert.calledOnce(fetchStub);
    sinon.assert.calledWith(
      fetchStub,
      `${brokerClientUrl}/${AGENT_SCAFFOLDER_LOG_PATH}/${actionId}`,
      sinon.match({
        method: 'POST',
        body: JSON.stringify({
          content: 'test log message',
          context: { step: '1' },
          actionId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('should handle log failure gracefully', async () => {
    fetchStub.resolves({
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => {
        throw new Error('Failed to read');
      },
    } as any);

    const context = new CustomScaffolderActionContext({
      brokerClientUrl,
      actionId,
      payload,
    });

    // Should not throw
    try {
      await context.log('test log message');
    } catch (e) {
      expect.fail('log should not throw');
    }
  });

  it('should manage outputs', () => {
    const context = new CustomScaffolderActionContext({
      brokerClientUrl,
      actionId,
      payload,
    });

    context.output('out1', 'val1');
    context.output('out2', { nested: 'val2' });

    expect(context.getOutputs()).to.deep.equal({
      out1: 'val1',
      out2: { nested: 'val2' },
    });
  });
});
