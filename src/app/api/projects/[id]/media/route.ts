import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MIME_TYPES: Record<string, { mediaType: "image" | "video"; extension: string }> = {
  "image/jpeg": { mediaType: "image", extension: "jpg" },
  "image/png": { mediaType: "image", extension: "png" },
  "image/webp": { mediaType: "image", extension: "webp" },
  "image/gif": { mediaType: "image", extension: "gif" },
  "video/mp4": { mediaType: "video", extension: "mp4" },
  "video/quicktime": { mediaType: "video", extension: "mov" },
  "video/webm": { mediaType: "video", extension: "webm" },
  "video/3gpp": { mediaType: "video", extension: "3gp" },
};

async function getOwnedProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createSupabaseAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return { user: null, error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  return { user, admin, error: null };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const owned = await getOwnedProject(projectId);
  if (owned.error || !owned.user || !owned.admin) return owned.error!;

  const body = (await request.json().catch(() => null)) as {
    action?: "sign" | "complete";
    mimeType?: string;
    size?: number;
    storagePath?: string;
    description?: string | null;
  } | null;
  const mimeType = body?.mimeType?.toLowerCase() ?? "";
  const media = MIME_TYPES[mimeType];
  const size = Number(body?.size);
  if (!media || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Upload an image or video up to 50 MB (JPEG, PNG, WebP, GIF, MP4, MOV, WebM, or 3GP)." }, { status: 400 });
  }

  if (body?.action === "sign") {
    const storagePath = `${owned.user.id}/${crypto.randomUUID()}.${media.extension}`;
    const { data, error } = await owned.admin.storage.from("project-media").createSignedUploadUrl(storagePath);
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Unable to prepare upload" }, { status: 500 });
    return NextResponse.json({ storagePath, token: data.token });
  }

  if (body?.action === "complete") {
    const storagePath = body.storagePath ?? "";
    if (!storagePath.startsWith(`${owned.user.id}/`)) return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });

    const filename = storagePath.slice(owned.user.id.length + 1);
    const { data: objects, error: listError } = await owned.admin.storage.from("project-media").list(owned.user.id, { search: filename });
    if (listError || !objects?.some((object) => object.name === filename)) {
      return NextResponse.json({ error: "Uploaded file was not found" }, { status: 400 });
    }
    const { data: last } = await owned.admin
      .from("project_media")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await owned.admin
      .from("project_media")
      .insert({
        user_id: owned.user.id,
        project_id: projectId,
        storage_path: storagePath,
        media_type: media.mediaType,
        mime_type: mimeType,
        description: body.description?.trim() || null,
        file_size_bytes: size,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  return NextResponse.json({ error: "Invalid upload action" }, { status: 400 });
}
