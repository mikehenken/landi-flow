import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Button } from './button';

/** Elevated surface card for Story boards and Epic overviews. */
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const StoryCard: Story = {
  render: () => (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Implement sidebar navigation</CardTitle>
        <CardDescription className="font-mono text-xs tabular-nums">LAN-42</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Add 240px left navigation with Epic and Story links.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">View Story</Button>
      </CardFooter>
    </Card>
  ),
};

export const EmptyEpic: Story = {
  render: () => (
    <Card className="w-[400px] text-center">
      <CardHeader>
        <CardTitle>No Epics yet</CardTitle>
        <CardDescription>
          Epics are strategic containers for your team&apos;s work.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button>Create your first Epic</Button>
      </CardFooter>
    </Card>
  ),
};
