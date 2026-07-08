import { redirect } from 'next/navigation';

/** PM shell entry — inbox is the default workspace view. */
export default function WorkspaceIndexPage(): never {
  redirect('/workspace/inbox');
}
