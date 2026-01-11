import UserModel from "../Model/UserModel";

const isAdmin = async (req,res,next)=>{

    const user = await UserModel.findOne({userId:req.userId});

    if(user && user.role === role.admin){
        next();
    }else{
        return res.status(403).send({message:"Only Admin users are allowed to access this route!"})
    }
}


export {isAdmin}