import * as nodeFetchModule from 'node-fetch';
import sinon from 'sinon';
import { CustomScaffolderAction } from '../CustomScaffolderAction';
import * as workspaceHandler from '../workspaceHandler';
import * as runtimeContext from '../runtimeContext';
import { AGENT_SCAFFOLDER_FINALIZE_PATH } from '../constants';
import { ScaffolderActionAgentConfiguration } from '$/types';

describe('CustomScaffolderAction', () => {
  let fetchStub: sinon.SinonStub;
  let downloadFileStub: sinon.SinonStub;
  let generateAndStreamZipfileToS3Stub: sinon.SinonStub;
  let addRunningActionStub: sinon.SinonStub;
  let removeRunningActionStub: sinon.SinonStub;
  let handlerStub: sinon.SinonStub;

  const actionId = 'test-action-id';
  const brokerClientUrl = 'http://broker.url';
  let configuration: ScaffolderActionAgentConfiguration;

  beforeEach(() => {
    fetchStub = sinon.stub(nodeFetchModule, 'default' as any);
    downloadFileStub = sinon.stub(workspaceHandler, 'downloadFile');
    generateAndStreamZipfileToS3Stub = sinon.stub(workspaceHandler, 'generateAndStreamZipfileToS3');
    addRunningActionStub = sinon.stub(runtimeContext, 'addRunningAction');
    removeRunningActionStub = sinon.stub(runtimeContext, 'removeRunningAction');
    handlerStub = sinon.stub().resolves();

    configuration = {
      name: 'test-action',
      type: 'scaffolder-action' as const,
      handler: handlerStub,
    };

    fetchStub.resolves({
      status: 200,
      statusText: 'OK',
      text: async () => 'Finalized',
    } as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should run the full flow successfully', async () => {
    const payload = {
      body: { input: 'data' },
      getPresign: 'http://get.url',
      putPresign: 'http://put.url',
    };
    const action = new CustomScaffolderAction({
      actionId,
      configuration,
      brokerClientUrl,
      payload,
    });

    generateAndStreamZipfileToS3Stub.resolves('test-etag');

    await action.start();

    sinon.assert.calledWith(addRunningActionStub, actionId);
    sinon.assert.calledWith(downloadFileStub, 'http://get.url', `/tmp/scaffolder/${actionId}`);
    sinon.assert.calledOnce(handlerStub);
    sinon.assert.calledWith(generateAndStreamZipfileToS3Stub, 'http://put.url', `/tmp/scaffolder/${actionId}`);
    sinon.assert.calledWith(removeRunningActionStub, actionId);

    sinon.assert.calledWith(
      fetchStub,
      `${brokerClientUrl}/${AGENT_SCAFFOLDER_FINALIZE_PATH}/${actionId}`,
      sinon.match({
        method: 'POST',
        body: JSON.stringify({
          status: 'success',
          payload: { workspace: true, etag: 'test-etag' },
          actionId,
        }),
      }),
    );
  });

  it('should run without download and upload if presigns are missing', async () => {
    const payload = {
      body: { input: 'data' },
    };
    const action = new CustomScaffolderAction({
      actionId,
      configuration,
      brokerClientUrl,
      payload,
    });

    await action.start();

    sinon.assert.notCalled(downloadFileStub);
    sinon.assert.calledOnce(handlerStub);
    sinon.assert.notCalled(generateAndStreamZipfileToS3Stub);
    
    sinon.assert.calledWith(
      fetchStub,
      sinon.match.any,
      sinon.match({
        body: JSON.stringify({
          status: 'success',
          payload: {},
          actionId,
        }),
      }),
    );
  });

  it('should finalize with failure if handler throws', async () => {
    const error = new Error('Handler failed');
    handlerStub.rejects(error);

    const action = new CustomScaffolderAction({
      actionId,
      configuration,
      brokerClientUrl,
      payload: { body: {} },
    });

    await action.start();

    sinon.assert.calledWith(
      fetchStub,
      sinon.match.any,
      sinon.match({
        body: JSON.stringify({
          status: 'failure',
          payload: { message: 'Handler failed' },
          actionId,
        }),
      }),
    );
  });

  it('should include outputs in finalization', async () => {
    handlerStub.callsFake(async (ctx) => {
      ctx.output('result', 'some-data');
    });

    const action = new CustomScaffolderAction({
      actionId,
      configuration,
      brokerClientUrl,
      payload: { body: {} },
    });

    await action.start();

    sinon.assert.calledWith(
      fetchStub,
      sinon.match.any,
      sinon.match({
        body: JSON.stringify({
          status: 'success',
          payload: { result: 'some-data' },
          actionId,
        }),
      }),
    );
  });
  it('should support non-string inputs in body', async () => {
    const payload = {
      body: { count: 123, active: true, nested: { key: 'value' } },
    };
    const action = new CustomScaffolderAction({
      actionId,
      configuration,
      brokerClientUrl,
      payload,
    });

    await action.start();

    sinon.assert.calledWith(handlerStub, sinon.match({
      payload: {
        body: { count: 123, active: true, nested: { key: 'value' } }
      }
    }));
  });
});
