import { Plus } from 'lucide-react'
import { Button } from '@librechat/client'

export default function ButtonSizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" variant="outline" aria-label="Add">
        <Plus className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
