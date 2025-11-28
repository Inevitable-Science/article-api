import { Request, Response } from "express";
import z from "zod";

import ArticleModel from "../../database/articleSchema";
import UserModel from "../../database/userSchema";
import OrganisationModel, {
  Organisation,
  OrganisationSchemaZ,
  UserPermissionsZ,
} from "../../database/organisationSchema";

import { generateRandomId, VerifyJWT } from "../../utils/utils";
import { ErrorCodes } from "../../utils/errors/errors";
import { handleServerError } from "../../utils/errors/errorHandler";

export async function fetchOrgHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    const userId = VerifyJWT(authHeader);
    const organisationId = z.string().parse(req.params.organisationId);

    const [user, organisation] = await Promise.all([
      await UserModel.findOne({ userId }),
      await OrganisationModel.findOne({ organisationId: organisationId }),
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
      await UserModel.find(),
      await ArticleModel.find({ organisationId: organisationId }),
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
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const user = await UserModel.findOne({ userId });
    const parsed = CreateBody.parse(req.body);

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
      new Set(parsed.users.map((u) => u.userId)).size !== parsed.users.length;
    if (hasDuplicates) {
      res.status(400).json({ error: ErrorCodes.DUPLICATE_ERROR });
      return;
    }

    const constructedOrg: Organisation = {
      ...parsed,
      organisationId: uniqueId,
    };

    const parsedOrg = OrganisationSchemaZ.parse(constructedOrg);
    const createdOrg = await OrganisationModel.create(parsedOrg);

    if (!createdOrg) throw new Error(ErrorCodes.DATABASE_ERROR);

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
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const data = CreateBody.parse(req.body);
    const organisationId = z.string().parse(req.params.organisationId);

    const [user, organisation] = await Promise.all([
      await UserModel.findOne({ userId }),
      await OrganisationModel.findOne({ organisationId: organisationId }),
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

    res.status(200).json({ organisation: data });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};
