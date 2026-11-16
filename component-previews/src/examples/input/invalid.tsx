import { useId } from 'react'
import { Input, Label } from '@librechat/client'

export default function InputInvalid() {
  const id = useId()
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor={id}>Email</Label>
      <Input id={id} defaultValue="ada@" aria-invalid aria-describedby={`${id}-error`} />
      <span id={`${id}-error`} role="alert" className="text-text-destructive text-sm">
        Enter a complete email address.
      </span>
    </div>
  )
}
