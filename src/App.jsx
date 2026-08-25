import { useState , useEffect} from "react";
import {Routes, Route , Navigate} from "react-router";
import HomePage from "./Pages/HomePage.jsx";
import LoginPage from "./Pages/LoginPage.jsx";
import Admin from "./Pages/AdminPage.jsx";
import RegisterPage from "./Pages/RegisterPage.jsx";
import {authenticateUser} from "../src/authSlice.js";
import { useDispatch, useSelector } from "react-redux";
import ProblemPage from "../src/Pages/ProblemPage.jsx";
import CreateProblem from "./Pages/CreateProb.jsx";
import UpdateProblem from "./Pages/UpdateProb.jsx";
import EditProblem from "./Pages/EditContent.jsx";
import DeleteProblem from "./Pages/deletePage.jsx";
import Forgotpass from "./Pages/ForgotPassword.jsx";
import ResetPage from "./Pages/ResetPage.jsx";
import ContestList from "./Pages/ContestList.jsx";
import ContestDescription from "./Pages/Contestdes.jsx";
import BattleArena from "./Pages/ArenaPage.jsx";
import Leaderboard from "./Pages/leaderboard.jsx";

function App(){
  const {isAuthenticate, loading, user}=useSelector((state)=>state.auth);
  const dispatch=useDispatch();
  

  useEffect(()=>{
    dispatch(authenticateUser());
  },[])

  if(loading){
    return <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  }

    return(
      <>
      <Routes>
        <Route path="/" element={isAuthenticate?<HomePage/>:<Navigate to={"/register"}/>}></Route>
        <Route path="/login" element={isAuthenticate?<Navigate to={"/"}/>:<LoginPage></LoginPage>}></Route>
        <Route path="/register" element={isAuthenticate?<Navigate to={"/"}/>:<RegisterPage></RegisterPage>}></Route>
        <Route path="/admin" element={isAuthenticate && user?.role==="admin"?<Admin/>:<Navigate to={"/"}/>}></Route>
        <Route path="/problem/:problemId" element={<ProblemPage/>}></Route>
        <Route path="/admin/createProblem" element={<CreateProblem/>}></Route>
        <Route path="/admin/updateProblem" element={<UpdateProblem/>}></Route>
        <Route path="/admin/updateProblem/:id" element={<EditProblem/>}></Route>
        <Route path="/admin/deleteProblem" element={<DeleteProblem/>}></Route>
        <Route path="/forgot-password" element={<Forgotpass/>}></Route>
        <Route path="/reset-password" element={<ResetPage/>}></Route>
        <Route path="/contestlist" element={<ContestList/>}></Route>
        <Route path="/contest/:id" element={<ContestDescription/>}></Route>
        <Route path="/contest/:id/arena" element={<BattleArena/>}></Route>
        <Route path="/contest/:id/leaderboard" element={<Leaderboard/>}></Route>
      </Routes>
      </>
    )
}

export default App;