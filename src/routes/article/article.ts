import { Request, Response } from "express";
import z from "zod";

import UserModel from "../../database/userSchema";
import { generateRandomId, VerifyJWT } from "../../utils/utils";
import OrganisationModel from "../../database/organisationSchema";
import ArticleModel, {
  Article,
  ArticleSchemaZ,
} from "../../database/articleSchema";

export async function fetchArticleHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { articleId } = req.params;
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const parsed = z.string().safeParse(articleId);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }

    const [user, article] = await Promise.all([
      UserModel.findOne({ userId }),
      ArticleModel.findOne({ articleId: parsed.data }),
    ]);

    if (!user || !article || article.displayRules.deleted) {
      res.status(403).json({ error: "Component Not Found" });
      return;
    }

    let articleOrg;
    let userPermissions;

    if (!user.isTopLevelAdmin) {
      articleOrg = await OrganisationModel.findOne({
        organisationId: article.organisationId,
        "users.userId": user.userId,
      });

      if (!articleOrg) {
        res
          .status(403)
          .json({ error: "User Does Not Have Access To This Organisation" });
        return;
      }

      userPermissions = articleOrg.users.find((u) => u.userId === user.userId);

      if (
        !userPermissions ||
        !(
          userPermissions.isAdmin ||
          userPermissions.canCreate ||
          userPermissions.canDelete ||
          userPermissions.canEdit
        )
      ) {
        res
          .status(403)
          .json({ error: "User Does Not Have Access To This Organisation" });
        return;
      }
    } else {
      articleOrg = await OrganisationModel.findOne({
        organisationId: article.organisationId,
      });

      if (!articleOrg) throw new Error("Organisation Not Found");

      userPermissions = {
        isAdmin: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      };
    }

    const [author, editors] = await Promise.all([
      await UserModel.findOne({ userId: article.metadata.author }),
      UserModel.find(
        { userId: { $in: article.metadata.editors } },
        { userMetadata: 1, userId: 1 }
      ),
    ]);

    const editorProfiles = editors.map((e) => ({
      username: e.userMetadata.username,
      profilePicture: e.userMetadata.profilePicture,
    }));

    const constructedArticle = {
      title: article.title,
      articleId: article.articleId,
      content: article.content,
      displayRules: {
        hidden: article.displayRules.hidden,
        showOnMainSite: article.displayRules.showOnMainSite,
      },
      organisation: {
        organisationName: articleOrg.organisationName,
        organisationId: articleOrg.organisationId,
        userPerms: { ...userPermissions },
      },
      metadata: {
        dateWritten: article.metadata.dateWritten,
        author: {
          username: author?.userMetadata.username,
          profilePicture: author?.userMetadata.profilePicture,
        },
        editors: editorProfiles,
      },
    };

    res.status(200).json(constructedArticle);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}

const CreateEditBody = z.object({
  title: z.string(),
  organisationId: z.string(),
  displayRules: z.object({
    hidden: z.boolean().default(false),
    showOnMainSite: z.boolean().default(true),
  }),
  content: z.object({
    keywords: z.array(z.string()),
    tags: z.array(z.string()),
    attachments: z.array(z.string()),
    landingImage: z.string(),
    content: z.string(),
  }),
});

export async function createArticleHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const parsed = CreateEditBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }
    const data = parsed.data;

    const user = await UserModel.findOne({ userId });
    if (!user) {
      res.status(404).json({ error: "User Not Found" });
      return;
    }

    const userOrgs = await OrganisationModel.find({
      "users.userId": user.userId,
    });
    const userHasOrg = userOrgs.find(
      (org) => org.organisationId === data.organisationId
    );

    if (!userHasOrg && !user.isTopLevelAdmin) {
      res.status(403).json({ error: "User Is Not In This Organisation" });
      return;
    }

    if (!user.isTopLevelAdmin) {
      const userPermissions = userHasOrg?.users.find(
        (u) => u.userId === user.userId
      );

      if (
        !userPermissions ||
        (!userPermissions.isAdmin && !userPermissions.canCreate)
      ) {
        res.status(403).json({ error: "User Does Not Have Create Permission" });
        return;
      }
    }

    let uniqueId;
    while (!uniqueId) {
      const id = generateRandomId("articleId");

      const idExsists = await ArticleModel.findOne({ articleId: id });
      if (!idExsists) {
        uniqueId = id;
      }
    }

    const article: Article = {
      ...data,
      articleId: uniqueId,
      displayRules: {
        ...data.displayRules,
        deleted: false,
      },
      metadata: {
        dateWritten: new Date(),
        author: user.userId,
        editors: [],
      },
    };

    const parsedArticle = ArticleSchemaZ.parse(article);
    await ArticleModel.create(parsedArticle);

    res
      .status(200)
      .json({ message: "Successfully Created Article", articleId: uniqueId });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}

export async function editArticleHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const { articleId } = req.params;
    const userId = VerifyJWT(authHeader);

    const parsed = CreateEditBody.safeParse(req.body);
    const parsedArticleId = z.string().safeParse(articleId);

    if (!parsed.success || !parsedArticleId.success) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }
    const data = parsed.data;

    const [user, article] = await Promise.all([
      await UserModel.findOne({ userId }),
      await ArticleModel.findOne({ articleId: parsedArticleId }),
    ]);

    if (!user || !article || article.displayRules.deleted) {
      res.status(404).json({ error: "Component Not Found" });
      return;
    }

    const userOrgs = await OrganisationModel.find({
      "users.userId": user.userId,
    });
    const userHasOrg = userOrgs.find(
      (org) => org.organisationId === data.organisationId
    );

    if (!userHasOrg && !user.isTopLevelAdmin) {
      res.status(403).json({ error: "User Is Not In This Organisation" });
      return;
    }

    if (!user.isTopLevelAdmin) {
      const userPermissions = userHasOrg?.users.find(
        (u) => u.userId === user.userId
      );

      if (
        !userPermissions ||
        (!userPermissions.isAdmin && !userPermissions.canEdit)
      ) {
        res.status(403).json({ error: "User Does Not Have Create Permission" });
        return;
      }
    }

    const isAlreadyEditor =
      user.userId === article.metadata.author ||
      article.metadata.editors.includes(user.userId);

    const editors = isAlreadyEditor
      ? article.metadata.editors
      : [...article.metadata.editors, user.userId];

    const objectArticle = article.toObject();

    const constructedArticle = {
      title: data.title,
      articleId: article.articleId,
      organisationId: data.organisationId,
      displayRules: {
        ...data.displayRules,
        deleted: false,
      },
      metadata: {
        ...objectArticle.metadata,
        editors: editors,
      },
      content: data.content,
    };

    const parsedArticle = ArticleSchemaZ.parse(constructedArticle);
    await ArticleModel.updateOne(
      { articleId: article.articleId },
      { $set: parsedArticle }
    );

    res.status(200).json({ message: "Successfully Saved Changes" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}

export async function deleteArticleHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userId = VerifyJWT(authHeader);

    const parsedArticle = z.string().safeParse(req.body.articleId);
    if (!parsedArticle.success) {
      res.status(400).json({ error: "Invalid Article ID" });
      return;
    }
    const articleId = parsedArticle.data.toLowerCase();

    const [user, article] = await Promise.all([
      UserModel.findOne({ userId }),
      ArticleModel.findOne({ articleId }),
    ]);

    if (!user || !article || article.displayRules.deleted) {
      res.status(404).json({ error: "User Or Article Not Found" });
      return;
    }

    if (!user.isTopLevelAdmin) {
      const userOrgs = await OrganisationModel.find({
        "users.userId": user.userId,
      });
      const organisation = userOrgs.find(
        (org) => org.organisationId === article.organisationId
      );

      if (!organisation) {
        res
          .status(403)
          .json({ error: "User Is Not In Designated Organisation" });
        return;
      }
      const userPermissions = organisation.users.find(
        (u) => u.userId === user.userId
      );

      if (
        !userPermissions ||
        (!userPermissions.isAdmin && !userPermissions.canDelete)
      ) {
        res.status(403).json({ error: "User Cannot Delete Articles" });
        return;
      }
    }

    article.displayRules.deleted = true;
    await article.save();

    res.status(200).json({ message: "Article Successfully Deleted" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}
