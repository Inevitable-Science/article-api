import type { Request, Response } from "express";
import z from "zod";

import ArticleModel from "../../database/articleSchema";
import type {
  Organisation} from "../../database/organisationSchema";
import OrganisationModel, {
  OrganisationSchemaZ,
  UserPermissionsZ,
} from "../../database/organisationSchema";
import UserModel from "../../database/userSchema";
import { handleServerError } from "../../utils/errors/errorHandler";
import { ErrorCodes } from "../../utils/errors/errors";
import type { Embed } from "../../utils/logAction";
import logAction from "../../utils/logAction";
import { generateDiscordTimestamp, generateRandomId, VerifyJWT } from "../../utils/utils";


export async function fetchOrgHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const auth = VerifyJWT(req);
    if (!auth.success) {
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    }
    const userId = auth.userId;

    const parsedOrgId = z.string().safeParse(req.params.organisationId);
    if (!parsedOrgId.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };
    const organisationId = parsedOrgId.data;

    const [user, organisation] = await Promise.all([
      UserModel.findOne({ userId }),
      OrganisationModel.findOne({ organisationId: organisationId }),
    ]);

    if (!user || !organisation) {
      res.status(404).json({ error: ErrorCodes.ELEMENT_NOT_FOUND });
      return;
    }

    const userIsOrgAdmin = organisation.users.find(
      (u) => u.userId === user.userId
    );
    if (!user.isTopLevelAdmin && !userIsOrgAdmin?.isAdmin) {
      res.status(403).json({ error: ErrorCodes.FORBIDDEN });
      return;
    }

    const [allUsers, orgArticles] = await Promise.all([
      UserModel.find(),
      ArticleModel.find({ organisationId: organisationId }),
    ]);

    const orgUserPermissionsMap = Object.fromEntries(
      organisation.users.map((u) => [
        u.userId,
        {
          isAdmin: u.isAdmin,
          canEdit: u.canEdit,
          canDelete: u.canDelete,
          canCreate: u.canCreate,
        },
      ])
    );
    const orgUserIds = new Set(organisation.users.map((u) => u.userId));
    const orgUsers = allUsers
      .filter((u) => orgUserIds.has(u.userId))
      .map((u) => {
        const perms = orgUserPermissionsMap[u.userId];
        return {
          userId: u.userId,
          username: u.userMetadata.username,
          profilePicture: u.userMetadata.profilePicture,
          ...perms,
        };
      });

    const nonOrgUsers = allUsers
      .filter((u) => !orgUserIds.has(u.userId))
      .map((u) => {
        return {
          userId: u.userId,
          username: u.userMetadata.username,
          profilePicture: u.userMetadata.profilePicture,
        };
      });

    const mappedOrgArticles = orgArticles
      .filter((a) => !a.displayRules.deleted)
      .map((article) => {
        return {
          title: article.title,
          articleId: article.articleId,
        };
      });

    const constructedOrg = {
      organisationName: organisation.organisationName,
      organisationId: organisation.organisationId.toLowerCase(),
      metadata: {
        logo: organisation.metadata.logo,
        description: organisation.metadata.description,
        website: organisation.metadata.website,
        x: organisation.metadata.x,
        discord: organisation.metadata.discord,
      },
      orgUsers,
      nonOrgUsers,
      articles: mappedOrgArticles,
    };

    res.status(200).json(constructedOrg);
    return;
  } catch (err) {
    await handleServerError(res, err);
  }
}

const CreateBody = z.object({
  organisationName: z.string(),
  users: z.array(UserPermissionsZ),
  metadata: z.object({
    logo: z.string(),
    description: z.string(),
    website: z
      .string()
      .regex(/^$|^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/),
    x: z.string(),
    discord: z.string().regex(/^$|^https:\/\/discord\.gg\/[A-Za-z0-9]+$/),
  }),
});

export async function createOrgHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const auth = VerifyJWT(req);
    if (!auth.success) {
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    }
    const userId = auth.userId;

    const user = await UserModel.findOne({ userId });
    const parsedBody = CreateBody.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }
    const data = parsedBody.data;

    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    if (!user.isTopLevelAdmin) {
      res.status(403).json({ error: ErrorCodes.FORBIDDEN });
      return;
    }

    let uniqueId;
    while (!uniqueId) {
      const id = generateRandomId("organisationId");
      const foundOrg = await OrganisationModel.findOne({ organisationId: id });

      if (!foundOrg) {
        uniqueId = id;
      }
    }

    const hasDuplicates =
      new Set(data.users.map((u) => u.userId)).size !== data.users.length;
    if (hasDuplicates) {
      res.status(400).json({ error: ErrorCodes.DUPLICATE_ERROR });
      return;
    }

    const constructedOrg: Organisation = {
      ...data,
      organisationId: uniqueId,
    };

    const parsedOrg = OrganisationSchemaZ.safeParse(constructedOrg);
    if (!parsedOrg.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }
    const createdOrg = await OrganisationModel.create(parsedOrg.data);

    if (!createdOrg) throw new Error(ErrorCodes.DATABASE_ERROR);

    const constructedEmbed: Embed = {
      title: "Organisation Created",
      description: `${data.organisationName} Created ${generateDiscordTimestamp(new Date(), "R")}`,
      author: {
        name: `${user.userMetadata.username} - ${user.userId}`,
        icon_url: user.userMetadata.profilePicture
      }
    };

    await logAction({
      action: "logAction",
      embed: constructedEmbed
    });

    res.status(200).json({ organisation: createdOrg });
    return;
  } catch (err) {
    await handleServerError(res, err);
  }
}

export async function editOrgHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const auth = VerifyJWT(req);
    if (!auth.success) {
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    }
    const userId = auth.userId;

    const parsedData = CreateBody.safeParse(req.body);
    const parsedOrganisationId = z.string().safeParse(req.params.organisationId);

    if (!parsedData.success || !parsedOrganisationId) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }
    const data = parsedData.data;
    const organisationId = parsedOrganisationId.data;

    const [user, organisation] = await Promise.all([
      UserModel.findOne({ userId }),
      OrganisationModel.findOne({ organisationId: organisationId }),
    ]);

    if (!user || !organisation) {
      res.status(404).json({ error: ErrorCodes.ELEMENT_NOT_FOUND });
      return;
    }

    const userRoles = organisation.users.find((u) => u.userId === user.userId);
    if (!user.isTopLevelAdmin && !userRoles?.isAdmin) {
      res.status(403).json({ error: ErrorCodes.FORBIDDEN });
      return;
    }

    const hasDuplicates =
      new Set(data.users.map((u) => u.userId)).size !== data.users.length;
    if (hasDuplicates) {
      res.status(400).json({ error: ErrorCodes.DUPLICATE_ERROR });
      return;
    }

    Object.assign(organisation, data);
    await organisation.save();

    const constructedEmbed: Embed = {
      title: "Organisation Edited",
      description: `${organisation.organisationName} Edited ${generateDiscordTimestamp(new Date(), "R")}`,
      author: {
        name: `${user.userMetadata.username} - ${user.userId}`,
        icon_url: user.userMetadata.profilePicture
      }
    };

    await logAction({
      action: "logAction",
      embed: constructedEmbed
    });

    res.status(200).json({ organisation: data });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};
