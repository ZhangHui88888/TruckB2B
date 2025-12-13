import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  
  // Redirect old brand filter URLs to new brand pages
  // /products?brand=volvo -> /brands/volvo
  if (url.pathname === '/products' && url.searchParams.has('brand')) {
    const brand = url.searchParams.get('brand');
    if (brand) {
      // Remove brand parameter and keep other parameters
      url.searchParams.delete('brand');
      
      // If there are other parameters (category, search), keep them on products page
      if (url.searchParams.toString()) {
        return next();
      }
      
      // Otherwise redirect to brand page
      return context.redirect(`/brands/${brand}`, 301);
    }
  }
  
  return next();
});
