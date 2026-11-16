import { Marquee } from '@/components/ui/marquee'
import OpenAIIcon from '@/components/icons/providers/openai'
import AnthropicIcon from '@/components/icons/providers/anthropic'
import GoogleIcon from '@/components/icons/providers/google'
import AzureIcon from '@/components/icons/providers/azure'
import AWSIcon from '@/components/icons/providers/aws'
import MistralIcon from '@/components/icons/providers/mistral'
import XAIIcon from '@/components/icons/providers/xai'
import DeepSeekIcon from '@/components/icons/providers/deepseek'
import OllamaIcon from '@/components/icons/providers/ollama'
import OpenRouterIcon from '@/components/icons/providers/openrouter'
import GroqIcon from '@/components/icons/providers/groq'
import AnyscaleIcon from '@/components/icons/providers/anyscale'
import ApipieIcon from '@/components/icons/providers/apipie'
import CloudflareIcon from '@/components/icons/providers/cloudflare'
import CloudGPUIcon from '@/components/icons/providers/cloudgpu'
import CohereIcon from '@/components/icons/providers/cohere'
import DatabricksIcon from '@/components/icons/providers/databricks'
import FireworksIcon from '@/components/icons/providers/fireworks'
import HeliconeIcon from '@/components/icons/providers/helicone'
import HuggingFaceIcon from '@/components/icons/providers/huggingface'
import LemonadeIcon from '@/components/icons/providers/lemonade'
import LiteLLMIcon from '@/components/icons/providers/litellm'
import MLXIcon from '@/components/icons/providers/mlx'
import MoonshotIcon from '@/components/icons/providers/moonshot'
import NearAIIcon from '@/components/icons/providers/nearai'
import NeuroChainIcon from '@/components/icons/providers/neurochain'
import PerplexityIcon from '@/components/icons/providers/perplexity'
import PortkeyIcon from '@/components/icons/providers/portkey'
import ShuttleAIIcon from '@/components/icons/providers/shuttleai'
import TogetherAIIcon from '@/components/icons/providers/togetherai'
import TrueFoundryIcon from '@/components/icons/providers/truefoundry'
import VLLMIcon from '@/components/icons/providers/vllm'
import VultrIcon from '@/components/icons/providers/vultr'

// Built-in providers and every integration in ai_endpoints/meta.json.
const providers = [
  { id: 'openai', name: 'OpenAI', icon: OpenAIIcon },
  { id: 'anthropic', name: 'Anthropic', icon: AnthropicIcon },
  { id: 'google', name: 'Google', icon: GoogleIcon },
  { id: 'azure', name: 'Azure OpenAI', icon: AzureIcon },
  { id: 'bedrock', name: 'AWS Bedrock', icon: AWSIcon },
  { id: 'xai', name: 'xAI', icon: XAIIcon },
  { id: 'mistral', name: 'Mistral AI', icon: MistralIcon },
  { id: 'deepseek', name: 'DeepSeek', icon: DeepSeekIcon },
  { id: 'ollama', name: 'Ollama', icon: OllamaIcon },
  { id: 'openrouter', name: 'OpenRouter', icon: OpenRouterIcon },
  { id: 'groq', name: 'Groq', icon: GroqIcon },
  { id: 'anyscale', name: 'Anyscale', icon: AnyscaleIcon },
  { id: 'apipie', name: 'APIpie', icon: ApipieIcon },
  { id: 'cloudflare', name: 'Cloudflare Workers AI', icon: CloudflareIcon },
  { id: 'cloudgpu', name: 'CloudGPU', icon: CloudGPUIcon },
  { id: 'cohere', name: 'Cohere', icon: CohereIcon },
  { id: 'databricks', name: 'Databricks', icon: DatabricksIcon },
  { id: 'fireworks', name: 'Fireworks AI', icon: FireworksIcon },
  { id: 'helicone', name: 'Helicone', icon: HeliconeIcon },
  { id: 'huggingface', name: 'Hugging Face', icon: HuggingFaceIcon },
  { id: 'lemonade', name: 'Lemonade', icon: LemonadeIcon },
  { id: 'litellm', name: 'LiteLLM', icon: LiteLLMIcon },
  { id: 'mlx', name: 'Apple MLX', icon: MLXIcon },
  { id: 'moonshot', name: 'Moonshot AI', icon: MoonshotIcon },
  { id: 'nearai', name: 'NEAR AI Cloud', icon: NearAIIcon },
  { id: 'neurochain', name: 'NeurochainAI', icon: NeuroChainIcon },
  { id: 'perplexity', name: 'Perplexity', icon: PerplexityIcon },
  { id: 'portkey', name: 'Portkey AI', icon: PortkeyIcon },
  { id: 'shuttleai', name: 'ShuttleAI', icon: ShuttleAIIcon },
  { id: 'togetherai', name: 'Together AI', icon: TogetherAIIcon },
  { id: 'truefoundry', name: 'TrueFoundry', icon: TrueFoundryIcon },
  { id: 'vllm', name: 'vLLM', icon: VLLMIcon },
  { id: 'vultrcloudinference', name: 'Vultr Cloud Inference', icon: VultrIcon },
]

const providerRows = [
  providers.filter((_, index) => index % 2 === 0),
  providers.filter((_, index) => index % 2 === 1),
]

export default function ProvidersMarquee({ description }: { description: string }) {
  return (
    <div className="landing-provider-marquees" role="group" aria-label={description} tabIndex={0}>
      {providerRows.map((row) => (
        <Marquee key={row[0].id} className="landing-provider-marquee" repeat={2}>
          <ul className="landing-provider-list" role="list">
            {row.map(({ id, name, icon: Icon }) => (
              <li key={id} className="landing-provider" data-provider={id}>
                <Icon aria-hidden="true" focusable="false" />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </Marquee>
      ))}
    </div>
  )
}
