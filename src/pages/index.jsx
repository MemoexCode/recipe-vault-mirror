import Layout from "./Layout.jsx";

import Browse from "./Browse";

import RecipeDetail from "./RecipeDetail";

import Categories from "./Categories";

import EditRecipe from "./EditRecipe";

import Collections from "./Collections";

import Trash from "./Trash";

import IngredientImages from "./IngredientImages";

import Changelog from "./Changelog";

import ChangelogAdmin from "./ChangelogAdmin";

import ShoppingList from "./ShoppingList";

import Import from "./Import";

import Logout from "./Logout";

import Debug from "./Debug";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Browse: Browse,
    
    RecipeDetail: RecipeDetail,
    
    Categories: Categories,
    
    EditRecipe: EditRecipe,
    
    Collections: Collections,
    
    Trash: Trash,
    
    IngredientImages: IngredientImages,
    
    Changelog: Changelog,
    
    ChangelogAdmin: ChangelogAdmin,
    
    ShoppingList: ShoppingList,
    
    Import: Import,
    
    Logout: Logout,
    
    Debug: Debug,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Browse />} />
                
                
                <Route path="/Browse" element={<Browse />} />
                
                <Route path="/RecipeDetail" element={<RecipeDetail />} />
                
                <Route path="/Categories" element={<Categories />} />
                
                <Route path="/EditRecipe" element={<EditRecipe />} />
                
                <Route path="/Collections" element={<Collections />} />
                
                <Route path="/Trash" element={<Trash />} />
                
                <Route path="/IngredientImages" element={<IngredientImages />} />
                
                <Route path="/Changelog" element={<Changelog />} />
                
                <Route path="/ChangelogAdmin" element={<ChangelogAdmin />} />
                
                <Route path="/ShoppingList" element={<ShoppingList />} />
                
                <Route path="/Import" element={<Import />} />
                
                <Route path="/Logout" element={<Logout />} />
                
                <Route path="/Debug" element={<Debug />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}