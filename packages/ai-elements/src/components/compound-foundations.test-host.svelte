<script lang="ts">
  import Artifact from './artifact/Artifact.svelte';
  import ArtifactAction from './artifact/ArtifactAction.svelte';
  import ArtifactActions from './artifact/ArtifactActions.svelte';
  import ArtifactClose from './artifact/ArtifactClose.svelte';
  import ArtifactContent from './artifact/ArtifactContent.svelte';
  import ArtifactHeader from './artifact/ArtifactHeader.svelte';
  import ArtifactTitle from './artifact/ArtifactTitle.svelte';
  import FileTree from './file-tree/FileTree.svelte';
  import FileTreeFile from './file-tree/FileTreeFile.svelte';
  import FileTreeFolder from './file-tree/FileTreeFolder.svelte';
  import Plan from './plan/Plan.svelte';
  import PlanContent from './plan/PlanContent.svelte';
  import PlanHeader from './plan/PlanHeader.svelte';
  import PlanTitle from './plan/PlanTitle.svelte';
  import PlanTrigger from './plan/PlanTrigger.svelte';
  import Queue from './queue/Queue.svelte';
  import QueueItem from './queue/QueueItem.svelte';
  import QueueItemContent from './queue/QueueItemContent.svelte';
  import QueueItemIndicator from './queue/QueueItemIndicator.svelte';
  import QueueList from './queue/QueueList.svelte';
  import QueueSection from './queue/QueueSection.svelte';
  import QueueSectionContent from './queue/QueueSectionContent.svelte';
  import QueueSectionLabel from './queue/QueueSectionLabel.svelte';
  import QueueSectionTrigger from './queue/QueueSectionTrigger.svelte';
  import Task from './task/Task.svelte';
  import TaskContent from './task/TaskContent.svelte';
  import TaskItem from './task/TaskItem.svelte';
  import TaskTrigger from './task/TaskTrigger.svelte';

  let { onartifactaction }: { onartifactaction?: () => void } = $props();

  const treeNodes = [{ id: 'file', name: 'README.md', type: 'file' as const }];
</script>

<Artifact>
  <ArtifactHeader>
    <ArtifactTitle>Generated report</ArtifactTitle>
    <ArtifactActions>
      <ArtifactAction label="Publish artifact" onclick={() => onartifactaction?.()}>Publish</ArtifactAction>
      <ArtifactClose />
    </ArtifactActions>
  </ArtifactHeader>
  <ArtifactContent>Artifact body</ArtifactContent>
</Artifact>

<Plan open>
  <PlanHeader><PlanTitle>Implementation plan</PlanTitle><PlanTrigger /></PlanHeader>
  <PlanContent>Plan body</PlanContent>
</Plan>

<Task open>
  <TaskTrigger title="Inspect workspace" />
  <TaskContent><TaskItem>Read package manifests</TaskItem></TaskContent>
</Task>

<Queue>
  <QueueSection open>
    <QueueSectionTrigger><QueueSectionLabel count={1} label="queued" /></QueueSectionTrigger>
    <QueueSectionContent>
      <QueueList><QueueItem><QueueItemIndicator /><QueueItemContent>Generate types</QueueItemContent></QueueItem></QueueList>
    </QueueSectionContent>
  </QueueSection>
</Queue>

<FileTree label="Compound files">
  <FileTreeFolder path="src" name="src">
    <FileTreeFile path="src/index.ts" name="index.ts" />
  </FileTreeFolder>
</FileTree>

<FileTree label="Tree one" nodes={treeNodes} />
<FileTree label="Tree two" nodes={treeNodes} />

<Queue title="Progress queue" items={[{ id: 'progress', title: 'Build package', progress: 125 }]} />
