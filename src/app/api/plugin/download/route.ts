import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    // Path to the plugin ZIP file
    const pluginPath = path.join(
      process.cwd(),
      "wordpress-plugin",
      "seo-max-connector.zip"
    );

    // Read the file
    const fileBuffer = await readFile(pluginPath);

    // Return the file as a download
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="seo-max-connector.zip"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Plugin download error:", error);
    return NextResponse.json(
      { error: "Plugin file not found" },
      { status: 404 }
    );
  }
}
