import { db } from "@/lib/db";
import { platformSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";

const DEFAULTS: Record<string, boolean> = {
  deployment_package_self_hosted_enabled: false,
  deployment_package_individual_enabled: true,
};

export async function isDeploymentPackageEnabled(model: string): Promise<boolean> {
  const key = `deployment_package_${model}_enabled`;
  if (!(key in DEFAULTS)) return true;

  try {
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);
    return row ? row.value === "true" : (DEFAULTS[key] ?? true);
  } catch {
    return DEFAULTS[key] ?? true;
  }
}
