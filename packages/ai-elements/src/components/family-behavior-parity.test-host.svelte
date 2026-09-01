<script lang="ts">
  import * as Agent from './agent/index.js';
  import * as ChainOfThought from './chain-of-thought/index.js';
  import * as Commit from './commit/index.js';
  import * as EnvironmentVariables from './environment-variables/index.js';
  import * as PackageInfo from './package-info/index.js';

  let {
    onagentopenchange,
    onchainopenchange,
    oncommitopenchange,
    oncopycommit,
    oncopyenvironment,
    onenvironmentshowchange,
    oncopyerror,
  }: {
    onagentopenchange?: (open: boolean) => void;
    onchainopenchange?: (open: boolean) => void;
    oncommitopenchange?: (open: boolean) => void;
    oncopycommit?: () => void;
    oncopyenvironment?: () => void;
    onenvironmentshowchange?: (show: boolean) => void;
    oncopyerror?: (error: Error) => void;
  } = $props();

  const commitDate = new Date(Date.now() - 86_400_000);
</script>

<Agent.Root data-testid="agent-root">
  <Agent.Header name="Inventory analyst" model="svadmin-local" />
  <Agent.Content>
    <Agent.Instructions text="Only inspect the current tenant." />
    <Agent.Tools>
      <Agent.Tool
        value="search"
        tool={{
          description: 'Search inventory',
          inputSchema: { type: 'string' },
          jsonSchema: { type: 'object', properties: { query: { type: 'string' } } },
        }}
        onopenchange={onagentopenchange}
      />
    </Agent.Tools>
    <Agent.Output schema={'type InventoryResult = { count: number };'} />
  </Agent.Content>
</Agent.Root>

<ChainOfThought.Root onopenchange={onchainopenchange} data-testid="chain-root">
  <ChainOfThought.Header />
  <ChainOfThought.Content>
    <ChainOfThought.Step label="Search inventory" description="Query the active warehouse" status="active">
      <ChainOfThought.SearchResults>
        <ChainOfThought.SearchResult>warehouse-a</ChainOfThought.SearchResult>
      </ChainOfThought.SearchResults>
    </ChainOfThought.Step>
    <ChainOfThought.Image caption="Inventory chart"><span>chart preview</span></ChainOfThought.Image>
  </ChainOfThought.Content>
</ChainOfThought.Root>

<Commit.Root onopenchange={oncommitopenchange} data-testid="commit-root">
  <Commit.Header>
    <Commit.Info>
      <Commit.Message>feat: add inventory report</Commit.Message>
      <Commit.Metadata>
        <Commit.Hash>abc1234</Commit.Hash>
        <Commit.Separator />
        <Commit.Timestamp date={commitDate} />
      </Commit.Metadata>
    </Commit.Info>
    <Commit.Actions>
      <Commit.CopyButton hash="abc1234" timeout={50} oncopy={oncopycommit} onerror={oncopyerror} />
    </Commit.Actions>
  </Commit.Header>
  <Commit.Content>
    <Commit.Files>
      <Commit.File>
        <Commit.FileInfo>
          <Commit.FileStatus status="modified" />
          <Commit.FilePath>src/report.ts</Commit.FilePath>
        </Commit.FileInfo>
        <Commit.FileChanges>
          <Commit.FileAdditions count={3} />
          <Commit.FileDeletions count={1} />
          <Commit.FileAdditions count={0} data-testid="zero-additions" />
        </Commit.FileChanges>
      </Commit.File>
    </Commit.Files>
  </Commit.Content>
</Commit.Root>

<EnvironmentVariables.Root onshowvalueschange={onenvironmentshowchange} data-testid="environment-root">
  <EnvironmentVariables.Header>
    <EnvironmentVariables.Title />
    <EnvironmentVariables.Toggle />
  </EnvironmentVariables.Header>
  <EnvironmentVariables.Content>
    <EnvironmentVariables.Variable name="API_TOKEN" value="super-secret-value-that-must-stay-hidden">
      <EnvironmentVariables.VariableGroup>
        <EnvironmentVariables.VariableName />
        <EnvironmentVariables.VariableRequired />
      </EnvironmentVariables.VariableGroup>
      <EnvironmentVariables.VariableGroup>
        <EnvironmentVariables.VariableValue data-testid="environment-value" />
        <EnvironmentVariables.VariableCopyButton
          copyFormat="export"
          timeout={50}
          oncopy={oncopyenvironment}
          onerror={oncopyerror}
        />
      </EnvironmentVariables.VariableGroup>
    </EnvironmentVariables.Variable>
  </EnvironmentVariables.Content>
</EnvironmentVariables.Root>

<PackageInfo.Root name="@svadmin/ai-elements" currentVersion="0.2.0" newVersion="0.3.0" changeType="minor" data-testid="package-root" />
<PackageInfo.Root name="streamdown-svelte" changeType="added">
  <PackageInfo.Header><PackageInfo.Name /><PackageInfo.ChangeType /></PackageInfo.Header>
  <PackageInfo.Description>Streaming Markdown renderer</PackageInfo.Description>
  <PackageInfo.Content>
    <PackageInfo.Dependencies>
      <PackageInfo.Dependency name="svelte" version="^5.56.10" />
    </PackageInfo.Dependencies>
  </PackageInfo.Content>
</PackageInfo.Root>
