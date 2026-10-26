import { useId, useState } from 'react'
import { Dropdown } from '@librechat/client'

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet', label: 'Claude Sonnet' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
]

export default function DropdownField() {
  const id = useId()
  const [model, setModel] = useState('')
  return (
    <div className="grid w-full max-w-sm gap-2">
      <span id={id} className="text-text-primary text-sm font-medium">
        Model
      </span>
      <Dropdown
        variant="field"
        aria-labelledby={id}
        value={model}
        onChange={setModel}
        placeholder="Choose a model"
        options={MODELS}
      />
    </div>
  )
}
