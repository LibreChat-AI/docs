import { Button, OGDialog, OGDialogTemplate, OGDialogTrigger } from '@librechat/client'

export default function DialogConfirm() {
  return (
    <OGDialog>
      <OGDialogTrigger asChild>
        <Button variant="destructive">Delete conversation</Button>
      </OGDialogTrigger>
      <OGDialogTemplate
        title="Delete conversation?"
        className="w-11/12 max-w-md"
        main={<p className="text-text-secondary text-sm">This removes it for good.</p>}
        selection={{
          selectHandler: () => undefined,
          selectClasses:
            'bg-surface-destructive hover:bg-surface-destructive-hover text-text-on-status',
          selectText: 'Delete',
        }}
        showCancelButton
      />
    </OGDialog>
  )
}
