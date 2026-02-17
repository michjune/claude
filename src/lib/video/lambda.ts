import {
  renderMediaOnLambda,
  getRenderProgress,
} from '@remotion/lambda/client';

interface RenderInput {
  composition: string;
  inputProps: Record<string, unknown>;
}

interface RenderResult {
  outputUrl: string;
  renderId: string;
}

const REGION = (process.env.REMOTION_AWS_REGION || 'us-east-1') as
  | 'us-east-1'
  | 'us-east-2'
  | 'us-west-2'
  | 'eu-central-1'
  | 'eu-west-1'
  | 'ap-southeast-1';

export async function renderOnLambda(input: RenderInput): Promise<RenderResult> {
  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SERVE_URL;

  if (!functionName || !serveUrl) {
    throw new Error(
      'Remotion Lambda not configured. Set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL.'
    );
  }

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName,
    serveUrl,
    composition: input.composition,
    inputProps: input.inputProps,
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 40,
  });

  // Poll for completion
  const outputUrl = await pollRenderProgress(renderId, bucketName);
  return { outputUrl, renderId };
}

async function pollRenderProgress(
  renderId: string,
  bucketName: string
): Promise<string> {
  const functionName = process.env.REMOTION_FUNCTION_NAME!;

  while (true) {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region: REGION,
    });

    if (progress.done && progress.outputFile) {
      return progress.outputFile;
    }

    if (progress.fatalErrorEncountered) {
      throw new Error(
        `Remotion render failed: ${progress.errors?.[0]?.message || 'Unknown error'}`
      );
    }

    // Wait 2 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
