import { useId, useState } from 'react'
import { Label, Switch } from '@librechat/client'

export default function SwitchDefault() {
  const id = useId()
  const [checked, setChecked] = useState(true)
  return (
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        aria-labelledby={`${id}-label`}
        checked={checked}
        onCheckedChange={setChecked}
      />
      <Label id={`${id}-label`} htmlFor={id}>
        Auto-send dictation
      </Label>
    </div>
  )
}
