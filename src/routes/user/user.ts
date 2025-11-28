import { Request, Response } from "express";
import z from "zod";
import _ from "lodash";

import ArticleModel from "../../database/articleSchema";
import UserModel, { UserSchema, UserSchemaZ } from "../../database/userSchema";
import OrganisationModel, {
  UserPermissions,
  UserPermissionsZ,
} from "../../database/organisationSchema";

import { generateRandomId, VerifyJWT } from "../../utils/utils";
import { ENV } from "../../utils/env";
import { ErrorCodes } from "../../utils/errors/errors";
import { handleServerError } from "../../utils/errors/errorHandler";


export async function getUserHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const user = await UserModel.findOne({ userId });

    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    let organisations;
    let articles;
    if (user.isTopLevelAdmin) {
      const allOrganisations = await OrganisationModel.find({}).lean();
      organisations = allOrganisations.map((org) => {
        return {
          organisationName: org.organisationName,
          organisationId: org.organisationId,
          metadata: org.metadata,
          userPermissions: {
            isAdmin: true,
            canEdit: true,
            canDelete: true,
            canCreate: true,
          },
        };
      });

      const allArticles = await ArticleModel.find({});
      const hideDeletedArticles = allArticles.filter(
        (article) => article.displayRules.deleted !== true
      );

      articles = hideDeletedArticles.map((article) => {
        return {
          title: article.title,
          articleId: article.articleId,
          organisationId: article.organisationId,
        };
      });
    } else {
      const fetchedOrganisations = await OrganisationModel.find({
        "users.userId": userId,
      }).lean();

      fetchedOrganisations.forEach((org) => {
        const orgUser = org.users.find((u) => u.userId === user.userId);
        const constructedOrg = {
          organisationName: org.organisationName,
          organisationId: org.organisationId,
          metadata: org.metadata,
          userPermissions: orgUser,
        };

        organisations.push(constructedOrg);
      });
    }

    if (!user.isTopLevelAdmin && organisations) {
      for (const org of organisations) {
        if (!org.userPermissions.canEdit || !org.userPermissions.isAdmin)
          continue;
        const orgArticles = await ArticleModel.find({
          organisationId: org.organisationId,
        });

        const hideDeletedArticles = orgArticles.filter(
          (article) => article.displayRules.deleted !== true
        );

        articles = hideDeletedArticles.map((article) => {
          return {
            title: article.title,
            articleId: article.articleId,
            organisationId: article.organisationId,
          };
        });
      }
    }

    const [userWrittenArticles, userEditedArticles] = await Promise.all([
      await ArticleModel.find({
        "metadata.author": userId,
      }),
      await ArticleModel.find({
        "metadata.editors": userId,
      }),
    ]);

    const filteredUserWritten = userWrittenArticles
      .filter((article) => article.displayRules.deleted !== true)
      .map((article) => {
        return {
          title: article.title,
          articleId: article.articleId,
          organisationId: article.organisationId,
        };
      });

    const filteredUserEdited = userEditedArticles
      .filter((article) => article.displayRules.deleted !== true)
      .map((article) => {
        return {
          title: article.title,
          articleId: article.articleId,
          organisationId: article.organisationId,
        };
      });

    const response = {
      user,
      organisations: organisations ?? [],
      writtenArticles: filteredUserWritten,
      editedArticles: filteredUserEdited,
      editableArticles: articles ?? [],
    };

    res.status(200).json(response);
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};

export async function getAllUserHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const user = await UserModel.findOne({ userId });
    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    if (!user.isTopLevelAdmin) {
      res.status(403).json({ error: ErrorCodes.FORBIDDEN });
      return;
    }

    const allUsers = await UserModel.find();
    const mappedAllUsers = allUsers.map((u) => {
      return {
        userId: u.userId,
        username: u.userMetadata.username,
        profilePicture: u.userMetadata.profilePicture,
      };
    });

    const response = { users: mappedAllUsers };
    res.status(200).json(response);
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};

const CreateBody = z.object({
  overwritePassword: z.string().optional(),
  user: z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    isTopLevelAdmin: z.boolean(),
    organisations: z.array(
      z.object({
        organisationId: z.string(),
        isAdmin: z.boolean(),
        canEdit: z.boolean(),
        canDelete: z.boolean(),
        canCreate: z.boolean(),
      })
    ),
  }),
});

export async function createUserHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }

    const data = parsed.data;
    const passedUser = data.user;

    if (data.overwritePassword !== ENV.APP_PASSWORD) {
      const [user, isExistingUser] = await Promise.all([
        await UserModel.findOne({ userId: userId.toLowerCase() }),
        await UserModel.findOne({
          walletAddress: passedUser.walletAddress.toLowerCase(),
        }),
      ]);

      if (!user) {
        res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
        return;
      }

      if (!user.isTopLevelAdmin) {
        res.status(403).json({ error: ErrorCodes.FORBIDDEN });
        return;
      }

      if (isExistingUser) {
        res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
        return;
      }
    } else {
      const existingUser = await UserModel.findOne({
        walletAddress: passedUser.walletAddress.toLowerCase(),
      });

      if (existingUser) {
        res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
        return;
      }
    }

    let uniqueId;
    while (!uniqueId) {
      const id = generateRandomId("userId");
      const idExsists = await UserModel.findOne({ userId: id });

      if (!idExsists) {
        uniqueId = id;
      }
    }

    const newUser: UserSchema = {
      walletAddress: passedUser.walletAddress.toLowerCase(),
      userId: uniqueId,
      currentNonce: 0,
      isTopLevelAdmin: data.overwritePassword
        ? passedUser.isTopLevelAdmin
        : false,
      attachments: [],
      userMetadata: {
        username: `User${uniqueId}`,
        profilePicture: "",
        socials: {
          x: "",
          linkedIn: "",
          website: "",
        },
      },
    };

    const parsedNewUser = UserSchemaZ.safeParse(newUser);
    if (!parsedNewUser) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };

    const createdUser = await UserModel.create(parsedNewUser.data);

    if (!createdUser) throw new Error(ErrorCodes.DATABASE_ERROR);

    const newUserOrgs = data.user.organisations;

    const uniqueOrgs = Array.from(
      new Map(newUserOrgs.map((org) => [org.organisationId, org])).values()
    );
    if (passedUser.isTopLevelAdmin && newUserOrgs.length === 0) {
      res.status(200).json({ message: "Successfully created new user" });
      return;
    }

    for (const org of uniqueOrgs) {
      try {
        const organisation = await OrganisationModel.findOne({
          organisationId: org.organisationId,
        });
        if (!organisation) continue;

        if (!org.isAdmin && !org.canEdit && !org.canDelete && !org.canCreate)
          continue;

        const userPerms: UserPermissions = {
          userId: createdUser.userId,
          isAdmin: org.isAdmin,
          canEdit: org.isAdmin ? true : org.canEdit,
          canDelete: org.isAdmin ? true : org.canDelete,
          canCreate: org.isAdmin ? true : org.canCreate,
        };

        const parsedUserPerms = UserPermissionsZ.safeParse(userPerms);
        if (!parsedUserPerms.success) continue;

        organisation.users.push(parsedUserPerms.data);
        await organisation.save();
      } catch (err) {
        console.log(err);
        continue;
      }
    }

    res.status(200).json({ message: "Successfully created new user" });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};

const EditBody = z.object({
  username: z.string().min(5),
  profilePicture: z.string(),
  socials: z.object({
    x: z.string(),
    linkedIn: z.string(),
    website: z.string(),
  }),
});

export async function editUserHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const parsed = EditBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }

    const userChanges = parsed.data;
    const user = await UserModel.findOne({ userId: userId });

    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    _.merge(user.userMetadata, userChanges);
    await user.save();

    res.status(200).json({ message: "User Changes Saved" });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};
