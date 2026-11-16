import { useId } from 'react'
import { Input, Label } from '@librechat/client'

export default function InputDefault() {
  const id = useId()
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor={id}>Display name</Label>
      <Input id={id} placeholder="Ada Lovelace" />
    </div>
  )
}
